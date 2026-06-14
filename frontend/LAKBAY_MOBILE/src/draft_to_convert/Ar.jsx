import styles from "./Container.module.css";

export const Container = ({ className, ...props }) => {
  return (
    <div className={styles.container + " " + className}>
      <div className={styles.statusBar}>
        <div className={styles.text}>
          <div className={styles.nine41}>9:41 </div>
        </div>
        <div className={styles.container2}>
          <div className={styles.container3}>
            <div className={styles.container4}></div>
            <div className={styles.container5}></div>
            <div className={styles.container6}></div>
            <div className={styles.container7}></div>
          </div>
          <img className={styles.icon} src="icon0.svg" />
          <div className={styles.container8}>
            <div className={styles.container9}>
              <div className={styles.container10}></div>
            </div>
            <div className={styles.container11}></div>
          </div>
        </div>
      </div>
      <div className={styles.container12}>
        <div className={styles.container13}>
          <div className={styles.button}>
            <img className={styles.icon2} src="icon1.svg" />
          </div>
          <img className={styles.vintaLogoSmall} src="vinta-logo-small0.svg" />
        </div>
        <div className={styles.container14}>
          <div className={styles.textMargin}>
            <div className={styles.text2}>
              <div className={styles.augmentedReality}>Augmented Reality </div>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.container15}>
        <div className={styles.paragraph}>
          <div className={styles.pointYourCameraAtMuseumExhibitsToUnlockCul}>
            <span>
              <span
                className={
                  styles.pointYourCameraAtMuseumExhibitsToUnlockCulSpan
                }
              >
                Point your camera at museum exhibits to unlock
              </span>
              <span
                className={
                  styles.pointYourCameraAtMuseumExhibitsToUnlockCulSpan2
                }
              >
                cultural stories
              </span>
              <span
                className={
                  styles.pointYourCameraAtMuseumExhibitsToUnlockCulSpan
                }
              >
                and heritage information about
              </span>
              <span
                className={
                  styles.pointYourCameraAtMuseumExhibitsToUnlockCulSpan3
                }
              >
                Zamboanga City.
              </span>
            </span>{" "}
          </div>
        </div>
        <div className={styles.container16}>
          <div className={styles.container17}></div>
          <div className={styles.container18}></div>
          <div className={styles.cornerBracket}></div>
          <div className={styles.cornerBracket2}></div>
          <div className={styles.cornerBracket3}></div>
          <div className={styles.cornerBracket4}></div>
          <div className={styles.container19}>
            <div className={styles.container20}></div>
            <div className={styles.text3}>
              <div className={styles.arActive}>AR ACTIVE </div>
            </div>
          </div>
          <div className={styles.container21}>
            <div className={styles.container2}>
              <div className={styles.container22}></div>
              <div className={styles.text4}>
                <div className={styles.cameraReady}>CAMERA READY </div>
              </div>
            </div>
            <div className={styles.text5}>
              <div className={styles.autoScanOn}>AUTO SCAN ON </div>
            </div>
          </div>
          <div className={styles.container23}>
            <div className={styles.paragraphMargin}>
              <div className={styles.paragraph2}>
                <div className={styles.searchingForExhibit}>
                  Searching for exhibit{" "}
                </div>
                <div className={styles.text6}>
                  <div className={styles.div}>... </div>
                </div>
              </div>
            </div>
            <div className={styles.container24}>
              <div className={styles.container25}></div>
              <div className={styles.container26}></div>
              <div className={styles.container27}></div>
              <div className={styles.container28}></div>
              <div className={styles.container29}>
                <img className={styles.icon3} src="icon2.svg" />
              </div>
            </div>
          </div>
        </div>
        <div className={styles.containerMargin}>
          <div className={styles.container30}>
            <div className={styles.container31}>
              <img className={styles.icon4} src="icon3.svg" />
            </div>
            <div className={styles.paragraph3}>
              <div className={styles.visitAMuseumAndPointYourCameraAtAnyCultur}>
                <span>
                  <span
                    className={
                      styles.visitAMuseumAndPointYourCameraAtAnyCulturSpan
                    }
                  >
                    Visit a museum and
                  </span>
                  <span
                    className={
                      styles.visitAMuseumAndPointYourCameraAtAnyCulturSpan2
                    }
                  >
                    point your camera
                  </span>
                  <span
                    className={
                      styles.visitAMuseumAndPointYourCameraAtAnyCulturSpan
                    }
                  >
                    at any cultural exhibit to begin
                  </span>
                </span>{" "}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.container32}>
          <div className={styles.container33}>
            <div className={styles.container34}></div>
            <div className={styles.text7}>
              <div className={styles.wellLitAreasWorkBest}>
                Well-lit areas work best{" "}
              </div>
            </div>
          </div>
          <div className={styles.container33}>
            <div className={styles.container35}></div>
            <div className={styles.text8}>
              <div className={styles.holdSteadyFor2S}>Hold steady for 2s </div>
            </div>
          </div>
        </div>
        <div className={styles.container36}>
          <div className={styles.container37}>
            <div className={styles.container38}>
              <div className={styles.text7}>
                <div className={styles.readEachInformationGiven}>
                  Read each information given{" "}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
