import '@webcomponents/scoped-custom-element-registry';

if(window.navigator && navigator.serviceWorker) {
  navigator.serviceWorker.getRegistrations()
  .then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}

export * from './chess-app';
