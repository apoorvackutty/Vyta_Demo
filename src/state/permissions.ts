// Who may take which staff action. The super admin (clinic owner) may take every one of them;
// the action is still recorded under her own staff id, so the audit trail shows she acted.
import type { QueueAction, StaffRole } from '../types';

export type StaffAction =
  | 'onboard' | 'send_form' | 'nudge' | 'snooze' | 'log_call'
  | 'confirm_visit' | 'mark_drawn' | 'labs_received' | 'reschedule' | 'pre_review';

// The first role listed owns the action; the others may also take it.
export const ACTION_ROLES: Record<StaffAction, StaffRole[]> = {
  onboard: ['guide'],
  send_form: ['guide', 'np'],
  nudge: ['guide'],
  snooze: ['guide'],
  log_call: ['guide'],
  confirm_visit: ['ma', 'guide'],
  mark_drawn: ['ma', 'guide'],
  labs_received: ['ma', 'guide'],
  reschedule: ['ma', 'guide'],
  pre_review: ['np'],
};

export const ROLE_SHORT: Record<StaffRole, string> = { guide: 'Guide', ma: 'MA', np: 'NP', coach: 'Coach', admin: 'Super admin' };

export const isSuperAdmin = (role: StaffRole) => role === 'admin';

export function can(role: StaffRole, action: StaffAction): boolean {
  return isSuperAdmin(role) || ACTION_ROLES[action].includes(role);
}

// "Acting as NP" when the super admin takes an action that belongs to another role; null otherwise.
export function actingAs(role: StaffRole, action: StaffAction): string | null {
  return isSuperAdmin(role) ? `Acting as ${ROLE_SHORT[ACTION_ROLES[action][0]]}` : null;
}

export function queueActionKind(a: QueueAction): StaffAction | null {
  return a.type === 'open_record' ? null : a.type;
}
