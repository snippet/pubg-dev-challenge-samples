define([
  '../../scripts/constants/window-names.js',
  '../../scripts/services/running-game-service.js',
  '../../scripts/services/windows-service.js',
  '../../scripts/services/hotkeys-service.js',
  '../../scripts/services/gep-service.js',
  '../../scripts/services/screenshots-service.js',
  '../../scripts/services/event-bus.js'
], function (WindowNames,
             runningGameService,
             windowsService,
             hotkeysService,
             gepService,
             screenshotService,
             eventBus) {

  class BackgroundController {
    static async run() {
      // this will be available when calling overwolf.windows.getMainWindow()
      window.ow_eventBus = eventBus;

      BackgroundController._registerAppLaunchTriggerHandler();
      BackgroundController._registerHotkeys();

      let startupWindow = await windowsService.getStartupWindowName();
      windowsService.restore(startupWindow);

      let isGameRunning = await runningGameService.isGameRunning();
      if (isGameRunning) {
        gepService.registerToGEP();
        await windowsService.restore(WindowNames.IN_GAME);
        windowsService.minimize(WindowNames.IN_GAME);
      }

      runningGameService.addGameRunningChangedListener((isGameRunning) => {
        if (isGameRunning) {
          windowsService.restore(WindowNames.IN_GAME);
        } else {
          // windowsService.minimize(WindowNames.IN_GAME);
          console.log('closing app after game closed');
          window.close();
        }
      });
    }

    /**
     * handles app launch trigger event - i.e dock icon clicked
     * @private
     */
    static _registerAppLaunchTriggerHandler() {
      overwolf.extensions.onAppLaunchTriggered.removeListener(
        BackgroundController._onAppRelaunch);
      overwolf.extensions.onAppLaunchTriggered.addListener(
        BackgroundController._onAppRelaunch);
    }

    static _onAppRelaunch() {
      windowsService.restore(WindowNames.SETTINGS);
    }

    /**
     * set custom hotkey behavior to take screenshot in game
     * @private
     */
    static _registerHotkeys() {
      hotkeysService.setTakeScreenshotHotkey(async () => {
        try {
          let screenshotUrl = await screenshotService.takeScreenshot();
          window.ow_eventBus.trigger('screenshot', screenshotUrl);
        } catch (e) {
          console.error(e);
        }
      }),
      hotkeysService.setToggleHotkey(async () => {
        let state = await windowsService.getStateWindowName(WindowNames.IN_GAME);
        if(state == 'minimized' || state == 'closed'){
          windowsService.restore(WindowNames.IN_GAME)
        }else if(state == 'normal' || state == 'maximized'){
          windowsService.minimize(WindowNames.IN_GAME)
        }
      });
    }
  }


  return BackgroundController;
});
