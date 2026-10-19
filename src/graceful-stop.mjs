// Begin every close immediately: a stuck background update must never delay
// stopping the model listener and releasing its service lock.
export async function closeManagedServices(resources, graceMs = 3000) {
  let timer;
  const closing = Promise.allSettled(resources.filter(Boolean).map(resource => Promise.resolve().then(() => resource.close())));
  try { return await Promise.race([closing.then(() => ({ timedOut: false })), new Promise(resolve => { timer = setTimeout(() => resolve({ timedOut: true }), graceMs); })]); }
  finally { clearTimeout(timer); }
}
