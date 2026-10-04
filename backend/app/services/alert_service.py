from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import DiagnosisStatus
from app.core.exceptions import NotFoundError
from app.models.alert import Alert
from app.models.diagnosis import Diagnosis
from app.models.farm import Farm
from app.models.field import Field
from app.models.weather_record import WeatherRecord
from app.repositories.alert_repository import AlertRepository


WEATHER_ALERT_TITLE = "Weather disease risk"
DIAGNOSIS_ALERT_TITLE = "Crop disease detected"


class AlertService:
    def __init__(
        self,
        db: Session,
    ) -> None:
        self.db = db
        self.alerts = AlertRepository(
            db,
        )

    def list(
        self,
        owner_id: UUID,
    ) -> list[Alert]:
        self.sync_for_owner(
            owner_id,
        )

        return self.alerts.list_for_owner(
            owner_id,
        )

    def mark_read(
        self,
        *,
        owner_id: UUID,
        alert_id: UUID,
    ) -> Alert:
        alert = self.alerts.get_owned(
            alert_id,
            owner_id,
        )

        if alert is None:
            raise NotFoundError(
                "Alert not found"
            )

        if not alert.is_read:
            alert.is_read = True

            alert = self.alerts.save(
                alert,
            )

        return alert

    def mark_all_read(
        self,
        owner_id: UUID,
    ) -> list[Alert]:
        self.alerts.mark_all_read(
            owner_id,
        )

        return self.alerts.list_for_owner(
            owner_id,
        )

    def sync_for_owner(
        self,
        owner_id: UUID,
    ) -> None:
        fields = list(
            self.db.scalars(
                select(Field)
                .join(
                    Farm,
                    Field.farm_id
                    == Farm.id,
                )
                .where(
                    Farm.owner_id
                    == owner_id,
                )
            ).all()
        )

        for field in fields:
            self._sync_weather_alert(
                field,
            )

            self._sync_diagnosis_alert(
                field,
            )

    def _sync_weather_alert(
        self,
        field: Field,
    ) -> None:
        record = self.db.scalar(
            select(WeatherRecord)
            .where(
                WeatherRecord.field_id
                == field.id,
            )
            .order_by(
                WeatherRecord.observed_at.desc(),
            )
            .limit(1)
        )

        if record is None:
            return

        risk_level = (
            record.risk_level
            or "low"
        ).lower()

        if risk_level not in {
            "high",
            "critical",
        }:
            return

        factors = list(
            record.risk_factors
            or []
        )

        explanation = (
            " ".join(
                factors[:2],
            )
            if factors
            else "Weather conditions indicate elevated crop disease pressure."
        )

        message = (
            f"{field.name}: "
            f"{risk_level.title()} weather-driven "
            f"disease risk ({record.risk_score}/100). "
            f"{explanation}"
        )

        self._upsert_source_alert(
            field_id=field.id,
            title=WEATHER_ALERT_TITLE,
            message=message,
            risk_level=risk_level,
            source_time=record.observed_at,
        )

    def _sync_diagnosis_alert(
        self,
        field: Field,
    ) -> None:
        diagnosis = self.db.scalar(
            select(Diagnosis)
            .where(
                Diagnosis.field_id
                == field.id,
                Diagnosis.status
                == DiagnosisStatus.ANALYZED,
            )
            .order_by(
                Diagnosis.created_at.desc(),
            )
            .limit(1)
        )

        if diagnosis is None:
            return

        label = (
            diagnosis.predicted_label
            or ""
        ).strip()

        if (
            not label
            or "healthy" in label.lower()
        ):
            return

        confidence = (
            diagnosis.confidence
            if diagnosis.confidence
            is not None
            else 0.0
        )

        if confidence < 0.60:
            return

        severity = (
            diagnosis.severity
            or "moderate"
        ).lower()

        risk_level = (
            "high"
            if severity
            in {
                "critical",
                "severe",
                "high",
            }
            else "moderate"
        )

        readable_label = (
            label
            .replace(
                "Tomato___",
                "",
            )
            .replace(
                "_",
                " ",
            )
        )

        confidence_percent = round(
            confidence * 100,
        )

        if (
            diagnosis.inference_mode
            == "onnx_model"
        ):
            message = (
                f"{field.name}: "
                f"{readable_label} detected with "
                f"{confidence_percent}% model confidence. "
                f"Severity: {severity.title()}."
            )

            if diagnosis.advisory:
                message += (
                    f" {diagnosis.advisory}"
                )
        else:
            message = (
                f"{field.name}: historical simulated screening record "
                f"for {readable_label} at {confidence_percent}% simulated "
                "confidence. Re-screen the crop with the trained prototype "
                "before making treatment decisions."
            )

        self._upsert_source_alert(
            field_id=field.id,
            title=DIAGNOSIS_ALERT_TITLE,
            message=message,
            risk_level=risk_level,
            source_time=diagnosis.created_at,
        )

    def _upsert_source_alert(
        self,
        *,
        field_id: UUID,
        title: str,
        message: str,
        risk_level: str,
        source_time: datetime,
    ) -> None:
        existing = (
            self.alerts
            .latest_for_field_title(
                field_id,
                title,
            )
        )

        if existing is not None:
            source_is_not_newer = (
                self._as_utc(
                    existing.created_at,
                )
                >= self._as_utc(
                    source_time,
                )
            )

            if source_is_not_newer:
                if (
                    existing.message
                    != message
                    or existing.risk_level
                    != risk_level
                ):
                    existing.message = message
                    existing.risk_level = (
                        risk_level
                    )

                    self.alerts.save(
                        existing,
                    )

                return

            if not existing.is_read:
                existing.message = message
                existing.risk_level = (
                    risk_level
                )

                self.alerts.save(
                    existing,
                )

                return

        self.alerts.add(
            Alert(
                field_id=field_id,
                title=title,
                message=message,
                risk_level=risk_level,
                is_read=False,
            )
        )

    @staticmethod
    def _as_utc(
        value: datetime,
    ) -> datetime:
        if value.tzinfo is None:
            return value.replace(
                tzinfo=timezone.utc,
            )

        return value.astimezone(
            timezone.utc,
        )
