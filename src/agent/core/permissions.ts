export type ActionRisk = 'safe' | 'mutating' | 'destructive'

export interface ActionPermission {
  risk: ActionRisk
  requiresConfirmation?: boolean
}

const defaults: Record<ActionRisk, ActionPermission> = {
  safe: { risk: 'safe' },
  mutating: { risk: 'mutating' },
  destructive: { risk: 'destructive', requiresConfirmation: true }
}

export class PermissionGate {
  private overrides = new Map<string, ActionPermission>()

  set(action: string, permission: ActionPermission) {
    this.overrides.set(action, permission)
    return () => this.overrides.delete(action)
  }

  get(action: string, fallback: ActionRisk = 'safe') {
    return this.overrides.get(action) ?? defaults[fallback]
  }

  requiresConfirmation(action: string, fallback: ActionRisk = 'safe') {
    return this.get(action, fallback).requiresConfirmation === true
  }
}

export const permissionGate = new PermissionGate()
