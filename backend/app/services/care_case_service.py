from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import (
    CareCaseEventType,
    CareCasePriority,
    CareCaseStatus,
    CareCaseTrend,
    DiagnosisStatus,
    UserRole,
)
from app.core.exceptions import NotFoundError
from app.models.care_case import CareCase, CareCaseUpdate
from app.models.diagnosis import Diagnosis
from app.models.farm import Farm
from app.models.field import Field
from app.models.user import User
from app.repositories.care_case_repository import CareCaseRepository
from app.schemas.care_case import CareCaseActionPlan, CareCasePublic, CareCaseUpdatePublic
from app.services.location_access import farm_is_accessible


TECHNICAL_REJECTIONS = {
    "unsupported_crop",
    "crop_mismatch",
    "image_quality_check_failed",
    "limited_crop_coverage",
}


class CareCaseService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.cases = CareCaseRepository(db)

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _readable_label(label: str | None) -> str:
        if not label:
            return "Crop-health condition"
        if "___" in label:
            label = label.split("___", 1)[1]
        return " ".join(label.replace("_", " ").split()).title()

    @classmethod
    def _priority_for(cls, diagnosis: Diagnosis) -> CareCasePriority:
        severity = (diagnosis.severity or "").strip().lower()

        if severity in {"critical", "severe"}:
            return CareCasePriority.CRITICAL
        if diagnosis.is_uncertain or severity == "high":
            return CareCasePriority.HIGH
        if severity in {"low", "healthy"}:
            return CareCasePriority.LOW
        return CareCasePriority.MODERATE

    @staticmethod
    def _follow_up_hours(priority: CareCasePriority) -> int:
        return {
            CareCasePriority.CRITICAL: 24,
            CareCasePriority.HIGH: 48,
            CareCasePriority.MODERATE: 72,
            CareCasePriority.LOW: 168,
        }[priority]

    @classmethod
    def _build_action_plan(cls, diagnosis: Diagnosis) -> dict:
        label = cls._readable_label(diagnosis.predicted_label)
        normalized = label.lower()
        priority = cls._priority_for(diagnosis)
        follow_up_hours = cls._follow_up_hours(priority)

        immediate = [
            "Inspect nearby plants and note whether similar symptoms are spreading.",
            "Keep a photo record from the same affected area for the next follow-up.",
        ]
        monitor = [
            "New lesions, discoloration or damage on nearby leaves.",
            "How quickly the affected area is expanding.",
        ]
        prevention = [
            "Keep tools clean between affected and healthy plants.",
            "Avoid unnecessary plant handling while symptoms are active.",
        ]
        escalation = [
            "Symptoms spread rapidly between follow-ups.",
            "A large portion of the crop becomes affected.",
            "The crop begins wilting, collapsing or losing fruit rapidly.",
        ]

        if "blight" in normalized:
            immediate.extend(
                [
                    "Reduce prolonged leaf wetness where practical.",
                    "Remove heavily affected debris only when locally recommended and safe to do so.",
                ]
            )
            monitor.append("Dark or expanding lesions on stems, leaves or fruit.")
            prevention.append("Improve airflow and avoid avoidable splash onto foliage.")
        elif "virus" in normalized:
            immediate.extend(
                [
                    "Limit unnecessary handling of symptomatic plants.",
                    "Inspect nearby plants for similar curling, mosaic or yellowing symptoms.",
                ]
            )
            monitor.append("Possible insect vectors or similar symptoms in neighboring plants.")
            prevention.append("Sanitize tools before moving to healthy plants.")
        elif "bacterial" in normalized:
            immediate.extend(
                [
                    "Avoid handling wet foliage where practical.",
                    "Reduce splash between affected and healthy plants.",
                ]
            )
            monitor.append("Water-soaked or expanding spots on nearby foliage.")
        elif "mite" in normalized:
            immediate.append("Inspect leaf undersides for mites, eggs or fine webbing.")
            monitor.append("Increasing stippling, bronzing or webbing on nearby leaves.")
        elif "powdery mildew" in normalized:
            immediate.append("Check surrounding foliage for powdery surface growth.")
            prevention.append("Improve canopy airflow where practical.")
        elif any(term in normalized for term in ("spot", "scab", "scorch", "rot")):
            immediate.append("Compare lesions across nearby leaves and fruit for similar patterns.")
            prevention.append("Reduce avoidable leaf wetness and splash where practical.")

        if diagnosis.is_uncertain:
            immediate.insert(
                0,
                "CropGuard is uncertain about the exact condition; keep monitoring and use the next follow-up photo to improve the evidence.",
            )
            escalation.insert(
                0,
                "The condition remains uncertain while symptoms continue to worsen.",
            )

        if diagnosis.advisory:
            immediate.append(diagnosis.advisory)

        return {
            "immediate_actions": list(dict.fromkeys(immediate)),
            "monitor_for": list(dict.fromkeys(monitor)),
            "prevention": list(dict.fromkeys(prevention)),
            "escalation_triggers": list(dict.fromkeys(escalation)),
            "follow_up_hours": follow_up_hours,
        }

    @staticmethod
    def _should_open_case(diagnosis: Diagnosis) -> bool:
        if diagnosis.status != DiagnosisStatus.ANALYZED:
            return False

        label = (diagnosis.predicted_label or "").strip()
        if not label:
            return False
        if label in TECHNICAL_REJECTIONS:
            return False
        if "healthy" in label.lower():
            return False
        return True

    def create_or_update_from_diagnosis(
        self,
        *,
        diagnosis: Diagnosis,
        field: Field,
        farmer_id: UUID,
    ) -> CareCase | None:
        if not self._should_open_case(diagnosis):
            return None

        priority = self._priority_for(diagnosis)
        plan = self._build_action_plan(diagnosis)
        now = self._now()
        next_follow_up = now + timedelta(hours=plan["follow_up_hours"])

        care_case = self.cases.active_for_field(field.id, farmer_id)

        if care_case is None:
            status = (
                CareCaseStatus.ESCALATED
                if diagnosis.is_uncertain or priority in {CareCasePriority.CRITICAL, CareCasePriority.HIGH}
                else CareCaseStatus.OPEN
            )

            care_case = CareCase(
                field_id=field.id,
                farmer_id=farmer_id,
                initial_diagnosis_id=diagnosis.id,
                latest_diagnosis_id=diagnosis.id,
                status=status,
                priority=priority,
                trend=CareCaseTrend.NEW,
                current_label=diagnosis.predicted_label,
                current_confidence=diagnosis.confidence,
                severity=diagnosis.severity,
                advisory=diagnosis.advisory,
                action_plan=plan,
                next_follow_up_at=next_follow_up,
                escalated_at=(now if status == CareCaseStatus.ESCALATED else None),
            )
            care_case = self.cases.add(care_case)

            self.cases.add_update(
                CareCaseUpdate(
                    care_case_id=care_case.id,
                    actor_id=None,
                    actor_role=None,
                    event_type=CareCaseEventType.SYSTEM,
                    trend=CareCaseTrend.NEW,
                    note=(
                        f"CropGuard created this care case from the {self._readable_label(diagnosis.predicted_label)} screening."
                    ),
                    recommendation=(
                        "Follow the care plan and submit a follow-up update by the scheduled review time."
                    ),
                    diagnosis_id=diagnosis.id,
                )
            )

            return self.cases.get(care_case.id)

        care_case.latest_diagnosis_id = diagnosis.id
        care_case.current_label = diagnosis.predicted_label
        care_case.current_confidence = diagnosis.confidence
        care_case.severity = diagnosis.severity
        care_case.advisory = diagnosis.advisory
        care_case.action_plan = plan
        care_case.priority = max(
            care_case.priority,
            priority,
            key=lambda value: {
                CareCasePriority.LOW: 0,
                CareCasePriority.MODERATE: 1,
                CareCasePriority.HIGH: 2,
                CareCasePriority.CRITICAL: 3,
            }[value],
        )
        care_case.next_follow_up_at = next_follow_up

        if diagnosis.is_uncertain or priority in {CareCasePriority.HIGH, CareCasePriority.CRITICAL}:
            care_case.status = CareCaseStatus.ESCALATED
            care_case.escalated_at = care_case.escalated_at or now
        elif care_case.status == CareCaseStatus.OPEN:
            care_case.status = CareCaseStatus.MONITORING

        care_case = self.cases.save(care_case)

        self.cases.add_update(
            CareCaseUpdate(
                care_case_id=care_case.id,
                actor_id=None,
                actor_role=None,
                event_type=CareCaseEventType.SYSTEM,
                trend=care_case.trend,
                note="A new screening was attached to the active care case.",
                recommendation=(
                    "CropGuard refreshed the care plan using the latest screening evidence."
                ),
                diagnosis_id=diagnosis.id,
            )
        )

        return self.cases.get(care_case.id)

    def list_for_farmer(self, farmer_id: UUID) -> list[CareCasePublic]:
        return [self.to_public(item) for item in self.cases.list_for_farmer(farmer_id)]

    def get_owned(self, case_id: UUID, farmer_id: UUID) -> CareCase:
        care_case = self.cases.get_owned(case_id, farmer_id)
        if care_case is None:
            raise NotFoundError("Care case not found")
        return care_case

    def list_for_actor(self, actor: User) -> list[CareCasePublic]:
        if actor.role == UserRole.ADMIN:
            cases = self.cases.list_all()
        elif actor.role == UserRole.EXTENSION_OFFICER:
            farms = list(self.db.scalars(select(Farm)).all())
            accessible_farm_ids = {
                farm.id for farm in farms if farm_is_accessible(actor, farm)
            }
            if not accessible_farm_ids:
                return []
            field_ids = set(
                self.db.scalars(
                    select(Field.id).where(Field.farm_id.in_(accessible_farm_ids))
                ).all()
            )
            cases = self.cases.list_for_field_ids(field_ids)
        else:
            return []

        return [self.to_public(item) for item in cases]

    def get_for_actor(self, case_id: UUID, actor: User) -> CareCase:
        care_case = self.cases.get(case_id)
        if care_case is None:
            raise NotFoundError("Care case not found")

        field, farm = self.cases.get_context(care_case)
        if field is None or farm is None:
            raise NotFoundError("Care case context not found")

        if actor.role == UserRole.ADMIN:
            return care_case
        if actor.role == UserRole.EXTENSION_OFFICER and farm_is_accessible(actor, farm):
            return care_case

        raise NotFoundError("Care case not found")

    def record_farmer_update(
        self,
        *,
        care_case: CareCase,
        farmer: User,
        trend: CareCaseTrend,
        note: str | None,
        diagnosis: Diagnosis | None = None,
    ) -> CareCasePublic:
        if care_case.farmer_id != farmer.id:
            raise NotFoundError("Care case not found")
        if care_case.status == CareCaseStatus.RESOLVED:
            raise ValueError("Resolved care cases cannot receive new farmer updates")

        now = self._now()
        care_case.trend = trend
        care_case.last_follow_up_at = now

        if diagnosis is not None and self._should_open_case(diagnosis):
            care_case.latest_diagnosis_id = diagnosis.id
            care_case.current_label = diagnosis.predicted_label
            care_case.current_confidence = diagnosis.confidence
            care_case.severity = diagnosis.severity
            care_case.advisory = diagnosis.advisory
            care_case.action_plan = self._build_action_plan(diagnosis)

            diagnosis_priority = self._priority_for(diagnosis)
            care_case.priority = max(
                care_case.priority,
                diagnosis_priority,
                key=lambda value: {
                    CareCasePriority.LOW: 0,
                    CareCasePriority.MODERATE: 1,
                    CareCasePriority.HIGH: 2,
                    CareCasePriority.CRITICAL: 3,
                }[value],
            )

        if trend == CareCaseTrend.WORSENING:
            care_case.status = CareCaseStatus.ESCALATED
            care_case.priority = (
                CareCasePriority.CRITICAL
                if care_case.priority == CareCasePriority.HIGH
                else CareCasePriority.HIGH
            )
            care_case.escalated_at = care_case.escalated_at or now
            care_case.next_follow_up_at = now + timedelta(hours=24)
            recommendation = (
                "The case was escalated because symptoms are worsening. Your assigned extension officer can now prioritize this case."
            )
        elif trend == CareCaseTrend.IMPROVING:
            care_case.status = CareCaseStatus.MONITORING
            care_case.next_follow_up_at = now + timedelta(hours=72)
            recommendation = (
                "Improvement recorded. Continue the current care plan and monitor for renewed spread before closing the case."
            )
        else:
            care_case.status = CareCaseStatus.MONITORING
            care_case.next_follow_up_at = now + timedelta(hours=48)
            recommendation = (
                "No clear improvement yet. Continue monitoring and submit another update; escalate if symptoms begin spreading."
            )

        care_case = self.cases.save(care_case)

        self.cases.add_update(
            CareCaseUpdate(
                care_case_id=care_case.id,
                actor_id=farmer.id,
                actor_role=farmer.role,
                event_type=CareCaseEventType.FARMER_UPDATE,
                trend=trend,
                note=(note.strip() if note else None),
                recommendation=recommendation,
                diagnosis_id=(diagnosis.id if diagnosis else None),
            )
        )

        return self.to_public(self.cases.get(care_case.id) or care_case)

    def add_officer_guidance(
        self,
        *,
        care_case: CareCase,
        actor: User,
        note: str,
        follow_up_hours: int | None,
        escalate: bool,
    ) -> CareCasePublic:
        now = self._now()

        if care_case.status == CareCaseStatus.RESOLVED:
            raise ValueError("Resolved care cases cannot receive new guidance")

        if escalate:
            care_case.status = CareCaseStatus.ESCALATED
            care_case.priority = max(
                care_case.priority,
                CareCasePriority.HIGH,
                key=lambda value: {
                    CareCasePriority.LOW: 0,
                    CareCasePriority.MODERATE: 1,
                    CareCasePriority.HIGH: 2,
                    CareCasePriority.CRITICAL: 3,
                }[value],
            )
            care_case.escalated_at = care_case.escalated_at or now
        elif care_case.status == CareCaseStatus.OPEN:
            care_case.status = CareCaseStatus.MONITORING

        if follow_up_hours is not None:
            care_case.next_follow_up_at = now + timedelta(hours=follow_up_hours)

        care_case = self.cases.save(care_case)

        self.cases.add_update(
            CareCaseUpdate(
                care_case_id=care_case.id,
                actor_id=actor.id,
                actor_role=actor.role,
                event_type=CareCaseEventType.OFFICER_GUIDANCE,
                trend=care_case.trend,
                note=note.strip(),
                recommendation=(
                    f"Follow-up requested in {follow_up_hours} hours."
                    if follow_up_hours is not None
                    else "Officer guidance added to the active care plan."
                ),
                diagnosis_id=care_case.latest_diagnosis_id,
            )
        )

        return self.to_public(self.cases.get(care_case.id) or care_case)

    def resolve(
        self,
        *,
        care_case: CareCase,
        actor: User,
        note: str | None,
    ) -> CareCasePublic:
        now = self._now()
        care_case.status = CareCaseStatus.RESOLVED
        care_case.resolved_at = now
        care_case.next_follow_up_at = None
        care_case = self.cases.save(care_case)

        self.cases.add_update(
            CareCaseUpdate(
                care_case_id=care_case.id,
                actor_id=actor.id,
                actor_role=actor.role,
                event_type=CareCaseEventType.STATUS_CHANGE,
                trend=care_case.trend,
                note=(note.strip() if note else "Care case marked resolved."),
                recommendation="Continue routine crop scouting and open a new screening if symptoms return.",
                diagnosis_id=care_case.latest_diagnosis_id,
            )
        )

        return self.to_public(self.cases.get(care_case.id) or care_case)

    def counts_for_actor(self, actor: User) -> tuple[int, int]:
        items = self.list_for_actor(actor)
        open_count = sum(item.status != CareCaseStatus.RESOLVED for item in items)
        escalated = sum(item.status == CareCaseStatus.ESCALATED for item in items)
        return open_count, escalated

    def global_counts(self) -> tuple[int, int]:
        cases = self.cases.list_all()
        open_count = sum(item.status != CareCaseStatus.RESOLVED for item in cases)
        escalated = sum(item.status == CareCaseStatus.ESCALATED for item in cases)
        return open_count, escalated

    def to_public(self, care_case: CareCase) -> CareCasePublic:
        field, farm = self.cases.get_context(care_case)
        farmer = self.db.get(User, care_case.farmer_id)

        if field is None or farm is None or farmer is None:
            raise NotFoundError("Care case context is unavailable")

        action_plan = care_case.action_plan or {
            "immediate_actions": [],
            "monitor_for": [],
            "prevention": [],
            "escalation_triggers": [],
            "follow_up_hours": 72,
        }

        updates: list[CareCaseUpdatePublic] = []
        for update in care_case.updates:
            actor_name = None
            if update.actor_id is not None:
                actor = self.db.get(User, update.actor_id)
                if actor is not None:
                    actor_name = actor.full_name

            updates.append(
                CareCaseUpdatePublic(
                    id=update.id,
                    event_type=update.event_type,
                    actor_role=update.actor_role,
                    actor_name=actor_name,
                    trend=update.trend,
                    note=update.note,
                    recommendation=update.recommendation,
                    diagnosis_id=update.diagnosis_id,
                    created_at=update.created_at,
                )
            )

        return CareCasePublic(
            id=care_case.id,
            field_id=care_case.field_id,
            farmer_id=care_case.farmer_id,
            initial_diagnosis_id=care_case.initial_diagnosis_id,
            latest_diagnosis_id=care_case.latest_diagnosis_id,
            status=care_case.status,
            priority=care_case.priority,
            trend=care_case.trend,
            current_label=care_case.current_label,
            current_confidence=care_case.current_confidence,
            severity=care_case.severity,
            advisory=care_case.advisory,
            action_plan=CareCaseActionPlan(**action_plan),
            next_follow_up_at=care_case.next_follow_up_at,
            last_follow_up_at=care_case.last_follow_up_at,
            escalated_at=care_case.escalated_at,
            resolved_at=care_case.resolved_at,
            created_at=care_case.created_at,
            updated_at=care_case.updated_at,
            field_name=field.name,
            crop_name=field.crop_name,
            farm_name=farm.name,
            village=farm.village,
            district=farm.district,
            state=farm.state,
            farmer_name=farmer.full_name,
            farmer_email=farmer.email,
            updates=updates,
        )
