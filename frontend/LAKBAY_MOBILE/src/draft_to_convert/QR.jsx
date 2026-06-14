import styles from "./Qr.module.css";

export const Qr = ({ className, ...props }) => {
  return (
    <div className={styles.qr + " " + className}>
      <div className={styles.container}>
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
            <img
              className={styles.vintaLogoSmall}
              src="vinta-logo-small0.svg"
            />
          </div>
          <div className={styles.container14}>
            <div className={styles.textMargin}>
              <div className={styles.text2}>
                <div className={styles.qrScanAndDiscover}>
                  QR SCAN AND DISCOVER{" "}
                </div>
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
                  Point your camera at QR code to unlock
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
            <img className={styles.container18} src="container17.svg" />
            <div className={styles.cornerBracket}></div>
            <div className={styles.cornerBracket2}></div>
            <div className={styles.cornerBracket3}></div>
            <div className={styles.cornerBracket4}></div>
            <div className={styles.container19}>
              <div className={styles.container20}></div>
              <div className={styles.text3}>
                <div className={styles.qr2}>QR </div>
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
          </div>
          <div className={styles.containerMargin}>
            <div className={styles.container23}>
              <div className={styles.container24}>
                <img className={styles.icon3} src="icon2.svg" />
              </div>
              <div className={styles.paragraph2}>
                <div
                  className={styles.visitAMuseumAndPointYourCameraAtAnyCultur}
                >
                  Scan the QR code posted at the cultural spot. Make sure you
                  are physically at the location{" "}
                </div>
              </div>
            </div>
          </div>
          <div className={styles.container25}>
            <div className={styles.container26}>
              <div className={styles.container27}></div>
              <div className={styles.text6}>
                <div className={styles.wellLitAreasWorkBest}>
                  Well-lit areas work best{" "}
                </div>
              </div>
            </div>
            <div className={styles.container26}>
              <div className={styles.container28}></div>
              <div className={styles.text7}>
                <div className={styles.holdSteadyFor2S}>
                  Hold steady for 2s{" "}
                </div>
              </div>
            </div>
          </div>
          <div className={styles.container25}>
            <div className={styles.container29}>
              <div className={styles.text6}>
                <div
                  className={styles.goToCulturalHotspotsOnTheMapToFindQrMarkers}
                >
                  Go to Cultural Hotspots on the map to find QR markers{" "}
                </div>
              </div>
            </div>
          </div>
          <div className={styles.container30}>
            <div className={styles.container31}>
              <div className={styles.text7}>
                <div className={styles.eachSpotHasAUniqueTriviaChallenge}>
                  Each spot has a unique trivia challenge{" "}
                </div>
              </div>
            </div>
            <div className={styles.container32}>
              <div className={styles.text7}>
                <div
                  className={
                    styles.completeAllSpotsToEarnTheExplorerCertificate
                  }
                >
                  Complete all spots to earn the Explorer certificate{" "}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
