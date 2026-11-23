import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Easing, Modal, StyleSheet, Text,
  TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';
import VintaStripe from './VintaStripe';

// After a QR scan, a spot's video presentation (AI-made or real) plays in a
// card about 3/4 of the screen: first a short "video presentation" intro, then
// the player. Skip / Continue / back all call onDone.

const INTRO_SECONDS = 3;
const SPROCKETS = 14;

// Cloudinary uploads get the H.264 MP4 rendition made at upload time (see
// VideoUploadSignatureView), which every Android WebView can play.
const CLOUDINARY_VIDEO = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\/)(?!f_mp4)/;
export function playableVideoUrl(url) {
  if (!url) return null;
  return url.replace(CLOUDINARY_VIDEO, '$1f_mp4,q_auto,vc_h264/');
}

const playerHtml = (url) => `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}
video{width:100%;height:100%;object-fit:contain;background:#000}</style></head>
<body><video id="v" controls playsinline webkit-playsinline preload="auto" controlsList="nodownload"></video>
<script>
var v=document.getElementById('v');
function send(t){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(t);}
['playing','waiting','ended','error'].forEach(function(e){v.addEventListener(e,function(){send(e);});});
v.src=${JSON.stringify(url).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')};
v.play().catch(function(){send('paused');});
</script></body></html>`;

export default function SpotVideoModal({ visible, videoUrl, spotName, onDone }) {
  const { width, height } = useWindowDimensions();
  const cardW = Math.min(width * 0.92, 520);
  const cardH = height * 0.75;

  const [phase, setPhase] = useState('intro');
  const [count, setCount] = useState(INTRO_SECONDS);
  const [status, setStatus] = useState('loading'); // loading | playing | paused | ended | error
  // The MP4 rendition is made in the background after upload; until it exists, play the original file.
  const [useOriginal, setUseOriginal] = useState(false);
  const playUrl = useOriginal ? videoUrl : playableVideoUrl(videoUrl);
  const source = useMemo(() => ({ html: playerHtml(playUrl), baseUrl: 'https://localhost/' }), [playUrl]);
  const fail = () => {
    if (!useOriginal && playUrl !== videoUrl) {
      setUseOriginal(true);
      setStatus('loading');
    } else {
      setStatus('error');
    }
  };

  const cardIn = useRef(new Animated.Value(0)).current;
  const clap = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const textIn = useRef(new Animated.Value(0)).current;
  const strip = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const playerIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return undefined;
    setPhase('intro');
    setCount(INTRO_SECONDS);
    setStatus('loading');
    setUseOriginal(false);
    [cardIn, clap, flash, textIn, progress, playerIn].forEach((v) => v.setValue(0));

    const clapOnce = Animated.sequence([
      Animated.timing(clap, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(clap, { toValue: 0, duration: 110, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(90),
          Animated.timing(flash, { toValue: 1, duration: 60, useNativeDriver: true }),
          Animated.timing(flash, { toValue: 0, duration: 260, useNativeDriver: true }),
        ]),
      ]),
    ]);
    Animated.sequence([
      Animated.spring(cardIn, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }),
      clapOnce,
      Animated.timing(textIn, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    Animated.timing(progress, { toValue: 1, duration: INTRO_SECONDS * 1000 + 600, easing: Easing.linear, useNativeDriver: false }).start();
    const stripLoop = Animated.loop(
      Animated.timing(strip, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true }),
    );
    stripLoop.start();

    const ticks = [];
    for (let i = 1; i <= INTRO_SECONDS; i += 1) {
      ticks.push(setTimeout(() => setCount(INTRO_SECONDS - i), 600 + i * 1000));
    }
    return () => {
      stripLoop.stop();
      ticks.forEach(clearTimeout);
    };
  }, [visible, cardIn, clap, flash, textIn, strip, progress, playerIn]);

  useEffect(() => {
    if (visible && phase === 'intro' && count === 0) setPhase('player');
  }, [visible, phase, count]);

  useEffect(() => {
    if (phase !== 'player') return;
    Animated.timing(playerIn, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [phase, playerIn]);

  const onMessage = (e) => {
    const event = e.nativeEvent.data;
    if (event === 'waiting') setStatus((s) => (s === 'ended' ? s : 'loading'));
    else if (event === 'error') fail();
    else if (['playing', 'paused', 'ended'].includes(event)) setStatus(event);
  };

  const ended = status === 'ended';
  const failed = status === 'error';

  const sprocketRow = (style) => (
    <Animated.View
      style={[styles.sprockets, style, {
        transform: [{ translateX: strip.interpolate({ inputRange: [0, 1], outputRange: [0, -28] }) }],
      }]}
    >
      {Array.from({ length: SPROCKETS }).map((_, i) => <View key={i} style={styles.hole} />)}
    </Animated.View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onDone}>
      <View style={styles.backdrop}>
        <Animated.View
          style={[styles.card, {
            width: cardW,
            height: cardH,
            opacity: cardIn,
            transform: [{ scale: cardIn.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }],
          }]}
        >
          <VintaStripe height={4} />

          {phase === 'intro' ? (
            <View style={styles.intro}>
              {sprocketRow(styles.sprocketsTop)}
              {sprocketRow(styles.sprocketsBottom)}
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash }]} />

              <View style={styles.slate}>
                <Animated.View
                  style={[styles.slateStick, {
                    transform: [{ rotate: clap.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-28deg'] }) }],
                  }]}
                >
                  {[0, 1, 2, 3].map((i) => <View key={i} style={styles.stripe} />)}
                </Animated.View>
                <View style={styles.slateBody}>
                  <Ionicons name="videocam" size={30} color={COLORS.gold} />
                </View>
              </View>

              <Animated.View
                style={{
                  alignItems: 'center',
                  opacity: textIn,
                  transform: [{ translateY: textIn.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
                }}
              >
                <Text style={styles.kicker}>VIDEO PRESENTATION</Text>
                <Text style={styles.introTitle} numberOfLines={2}>{spotName}</Text>
                <Text style={styles.introSub}>A short film about this place is about to play.</Text>
              </Animated.View>

              <View style={styles.countWrap}>
                <Text style={styles.countText}>{count > 0 ? `Starting in ${count}` : 'Starting…'}</Text>
                <View style={styles.bar}>
                  <Animated.View
                    style={[styles.barFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
                  />
                </View>
                <TouchableOpacity onPress={() => setPhase('player')} style={styles.playNow} activeOpacity={0.8}>
                  <Ionicons name="play" size={14} color={COLORS.navy} />
                  <Text style={styles.playNowText}>Play now</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Animated.View style={[styles.player, { opacity: playerIn }]}>
              <View style={styles.header}>
                <View style={styles.headerIcon}>
                  <Ionicons name="film" size={16} color={COLORS.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.headerKicker}>VIDEO PRESENTATION</Text>
                  <Text style={styles.headerTitle} numberOfLines={1}>{spotName}</Text>
                </View>
              </View>

              <View style={styles.videoBox}>
                {failed ? (
                  <View style={styles.center}>
                    <Ionicons name="cloud-offline-outline" size={34} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.errorText}>{"The video couldn't load. Check your connection, or continue to the story."}</Text>
                  </View>
                ) : (
                  <WebView
                    source={source}
                    style={styles.webview}
                    originWhitelist={['*']}
                    javaScriptEnabled
                    allowsInlineMediaPlayback
                    mediaPlaybackRequiresUserAction={false}
                    allowsFullscreenVideo
                    onMessage={onMessage}
                    key={playUrl}
                    onError={fail}
                  />
                )}
                {status === 'loading' && (
                  <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
                    <ActivityIndicator color={COLORS.gold} size="large" />
                  </View>
                )}
              </View>

              <View style={styles.note}>
                <Ionicons name="information-circle" size={16} color={COLORS.gold} style={{ marginTop: 1 }} />
                <Text style={styles.noteText}>
                  This video is important: it is connected to {spotName} and shows what makes this place special.
                </Text>
              </View>

              <View style={styles.actions}>
                {!ended && (
                  <TouchableOpacity style={styles.skipBtn} onPress={onDone} activeOpacity={0.8}>
                    <Text style={styles.skipText}>Skip video</Text>
                    <Ionicons name="play-skip-forward" size={14} color="rgba(255,255,255,0.85)" />
                  </TouchableOpacity>
                )}
                {(ended || failed) && (
                  <TouchableOpacity style={styles.continueBtn} onPress={onDone} activeOpacity={0.85}>
                    <Text style={styles.continueText}>Continue to the story</Text>
                    <Ionicons name="arrow-forward" size={15} color={COLORS.navy} />
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(3,8,30,0.82)', alignItems: 'center', justifyContent: 'center',
  },
  card: {
    backgroundColor: COLORS.navy, borderRadius: 22, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.35)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 20, elevation: 14,
  },

  intro: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  flash: { backgroundColor: '#FFFFFF' },
  sprockets: { position: 'absolute', left: 0, flexDirection: 'row', width: '140%' },
  sprocketsTop: { top: 14 },
  sprocketsBottom: { bottom: 14 },
  hole: { width: 14, height: 10, borderRadius: 2, marginRight: 14, backgroundColor: 'rgba(255,255,255,0.14)' },

  slate: { width: 112, marginBottom: 26 },
  slateStick: {
    height: 20, flexDirection: 'row', overflow: 'hidden', borderRadius: 3,
    backgroundColor: '#111827', transformOrigin: 'left bottom', marginBottom: 3,
  },
  stripe: { width: 16, height: 30, marginRight: 12, backgroundColor: '#FFFFFF', transform: [{ skewX: '-30deg' }], marginTop: -5 },
  slateBody: {
    height: 66, borderRadius: 6, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(251,191,36,0.55)',
  },

  kicker: { fontFamily: FONTS.bold, fontSize: 12, letterSpacing: 3, color: COLORS.gold },
  introTitle: { fontFamily: FONTS.bold, fontSize: 24, color: '#FFFFFF', textAlign: 'center', marginTop: 8 },
  introSub: { fontFamily: FONTS.regular, fontSize: 13, color: 'rgba(255,255,255,0.72)', textAlign: 'center', marginTop: 8 },

  countWrap: { alignItems: 'center', marginTop: 30, width: '80%' },
  countText: { fontFamily: FONTS.semiBold, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 8 },
  bar: { height: 6, width: '100%', borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: COLORS.gold },
  playNow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18,
    backgroundColor: COLORS.gold, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
  },
  playNowText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.navy },

  player: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerIcon: {
    width: 32, height: 32, borderRadius: 16, marginRight: 10,
    backgroundColor: 'rgba(251,191,36,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  headerKicker: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 2, color: COLORS.gold },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFFFFF', marginTop: 1 },

  videoBox: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  errorText: { fontFamily: FONTS.regular, fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 10 },

  note: {
    flexDirection: 'row', gap: 8, marginHorizontal: 14, marginTop: 12, padding: 10, borderRadius: 12,
    backgroundColor: 'rgba(251,191,36,0.10)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)',
  },
  noteText: { flex: 1, fontFamily: FONTS.medium, fontSize: 12, lineHeight: 17, color: 'rgba(255,255,255,0.9)' },

  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 14 },
  skipBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  skipText: { fontFamily: FONTS.semiBold, fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  continueBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 18,
    borderRadius: 22, backgroundColor: COLORS.gold,
  },
  continueText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.navy },
});
