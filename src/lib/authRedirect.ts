const destinationKey = 'experiment_oauth_destination'

export function isSafeAppDestination(destination: string | null | undefined) {
  return Boolean(destination?.startsWith('/') && !destination.startsWith('//'))
}

export function saveAuthDestination(destination?: string | null) {
  if (isSafeAppDestination(destination)) {
    sessionStorage.setItem(destinationKey, destination!)
  }
}

export function takeAuthDestination(defaultDestination = '/dashboard') {
  const saved = sessionStorage.getItem(destinationKey)
  sessionStorage.removeItem(destinationKey)
  return isSafeAppDestination(saved) ? saved! : defaultDestination
}

export function clearAuthDestination() {
  sessionStorage.removeItem(destinationKey)
}
