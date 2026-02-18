// OLD (still works)
const observer = scene.registerBeforeRender(() => { ... });
return () => scene.unregisterBeforeRender(observer);

// NEW — modern, cleaner, same performance
const observer = scene.onBeforeRenderObservable.add(() => { ... });
return () => scene.onBeforeRenderObservable.remove(observer);