import {
  Capacitor,
} from "@capacitor/core";

import {
  LocalNotifications,
} from "@capacitor/local-notifications";

import type {
  CareCase,
} from "@/features/careCases/types";


const CHANNEL_ID =
  "care-case-reminders";

const MANAGED_ID_MIN =
  100_000_000;

const MANAGED_ID_MAX =
  999_999_999;

let initialized =
  false;


function notificationId(
  careCaseId: string,
): number {
  let hash =
    0;

  for (
    let index = 0;
    index < careCaseId.length;
    index += 1
  ) {
    hash =
      (
        (hash * 31)
        + careCaseId.charCodeAt(index)
      ) | 0;
  }

  const positive =
    Math.abs(
      hash === -2147483648
        ? 2147483647
        : hash,
    );

  return (
    MANAGED_ID_MIN
    + (
      positive
      % (
        MANAGED_ID_MAX
        - MANAGED_ID_MIN
      )
    )
  );
}


function isNative(): boolean {
  return Capacitor.isNativePlatform();
}


async function ensurePermission():
  Promise<boolean> {
  const current =
    await LocalNotifications
      .checkPermissions();

  if (
    current.display
    === "granted"
  ) {
    return true;
  }

  if (
    current.display
      === "denied"
  ) {
    return false;
  }

  const requested =
    await LocalNotifications
      .requestPermissions();

  return (
    requested.display
    === "granted"
  );
}


export async function
initializeNativeNotifications():
Promise<void> {
  if (
    !isNative()
    || initialized
  ) {
    return;
  }

  initialized =
    true;

  if (
    Capacitor.getPlatform()
    === "android"
  ) {
    await LocalNotifications
      .createChannel({
        id:
          CHANNEL_ID,

        name:
          "Crop care reminders",

        description:
          "Reminders for active CropGuard care-case follow-ups.",
      });
  }

  await LocalNotifications
    .addListener(
      "localNotificationActionPerformed",
      () => {
        window.location.hash =
          "/care-cases";
      },
    );
}


export async function
syncCareCaseReminders(
  careCases: CareCase[],
): Promise<void> {
  if (!isNative()) {
    return;
  }

  const schedulable =
    careCases.filter(
      (careCase) =>
        careCase.status
          !== "resolved"
        && Boolean(
          careCase.next_follow_up_at,
        ),
    );

  if (
    schedulable.length
    === 0
  ) {
    return;
  }

  const permitted =
    await ensurePermission();

  if (!permitted) {
    return;
  }

  await initializeNativeNotifications();

  const pending =
    await LocalNotifications
      .getPending();

  const managed =
    pending.notifications
      .filter(
        (notification) =>
          notification.id
            >= MANAGED_ID_MIN
          && notification.id
            <= MANAGED_ID_MAX,
      )
      .map(
        (notification) => ({
          id:
            notification.id,
        }),
      );

  if (
    managed.length
    > 0
  ) {
    await LocalNotifications
      .cancel({
        notifications:
          managed,
      });
  }

  const now =
    Date.now();

  const notifications =
    schedulable.flatMap(
      (careCase) => {
        if (
          !careCase.next_follow_up_at
        ) {
          return [];
        }

        const at =
          new Date(
            careCase.next_follow_up_at,
          );

        if (
          Number.isNaN(
            at.getTime(),
          )
          || at.getTime()
            <= now + 30_000
        ) {
          return [];
        }

        return [
          {
            id:
              notificationId(
                careCase.id,
              ),

            title:
              "CropGuard follow-up due",

            body:
              `Check ${careCase.crop_name} in ${careCase.field_name} and update whether it is improving, the same, or worsening.`,

            channelId:
              CHANNEL_ID,

            schedule: {
              at,
              allowWhileIdle:
                true,
            },

            extra: {
              careCaseId:
                careCase.id,
            },
          },
        ];
      },
    );

  if (
    notifications.length
    > 0
  ) {
    await LocalNotifications
      .schedule({
        notifications,
      });
  }
}