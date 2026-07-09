const SESSION_ERRORS = [/not authenticated/i, /session expired/i, /unauthorized/i]

export function isSessionError(message: string): boolean {
  return SESSION_ERRORS.some((re) => re.test(message))
}

export function isLoginCancelled(message: string): boolean {
  return /login cancelled/i.test(message)
}
