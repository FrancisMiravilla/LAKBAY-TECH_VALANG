import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';

const HTML_ESCAPE = { '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;', '&': '&amp;' };
const escapeAttr = (s) => String(s).replace(/["'<>&]/g, (c) => HTML_ESCAPE[c]);

function build3DViewerHTML(modelUrl) {
  // Only allow https:// model URLs (data: URLs are resolved before reaching here
  // because normalizeIcon() always resolves relative paths to ORIGIN + path).
  let safe;
  try {
    const parsed = new URL(modelUrl);
    if (parsed.protocol !== 'https:') return null;
    safe = escapeAttr(modelUrl);
  } catch {
    return null;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <script type="module"
    src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"
    integrity="sha384-NxrHiuPcsJaRbXc9EoFTt5OZ6WPVqKeDgcnykGs3spXmq0J7hbbGGlyUkrGuoJoA"
    crossorigin="anonymous">
  </script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: transparent; overflow: hidden; }
    model-viewer { width: 100%; height: 100%; --progress-bar-color: transparent; }
  </style>
</head>
<body>
  <model-viewer
    src="${safe}"
    auto-rotate
    camera-controls
    bounds="tight"
    exposure="1"
    shadow-intensity="1"
    style="width:100%;height:100%"
  ></model-viewer>
</body>
</html>`;
}

function NoModel({ color }) {
  return (
    <View style={[styles.noModelBox, { borderColor: color + '44' }]}>
      <Ionicons name="cube-outline" size={52} color={color} style={{ opacity: 0.5 }} />
      <Text style={[styles.noModelText, { color: color }]}>3D model not uploaded yet</Text>
    </View>
  );
}

export default function CatchDetailsScreen({ route, navigation }) {
  const { icon } = route.params;
  const iconColor = icon.color || COLORS.primary;

  const viewerHTML = useMemo(
    () => icon.model_3d ? build3DViewerHTML(icon.model_3d) : null,
    [icon.model_3d],
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={iconColor} />

      {/* Coloured header */}
      <View style={[styles.headerBg, { backgroundColor: iconColor }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{icon.name}</Text>
          </View>
          <View style={styles.iconBtn} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── 3D Model ── */}
        <View style={[styles.modelCard, { borderColor: iconColor + '44' }]}>
          {viewerHTML ? (
            <WebView
              source={{ html: viewerHTML }}
              style={styles.webview}
              javaScriptEnabled
              originWhitelist={['https://*']}
              allowsFullscreenVideo
              scrollEnabled={false}
            />
          ) : (
            <NoModel color={iconColor} />
          )}
        </View>

        {/* ── Name centred ── */}
        <Text style={styles.iconName}>{icon.name}</Text>
        {!!icon.tagline && <Text style={styles.iconTagline}>{icon.tagline}</Text>}

        {/* ── Content card ── */}
        <View style={[styles.infoCard, { borderColor: iconColor + '44' }]}>

          {/* About */}
          <Text style={[styles.sectionLabel, { color: iconColor }]}>ABOUT</Text>
          <Text style={styles.bodyText}>
            {icon.about || 'No description available.'}
          </Text>

          <View style={styles.divider} />

          {/* Cultural Significance */}
          <Text style={[styles.sectionLabel, { color: iconColor }]}>CULTURAL SIGNIFICANCE</Text>
          <Text style={styles.bodyText}>
            {icon.significance || 'No cultural significance noted.'}
          </Text>

        </View>

      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.continueBtn, { backgroundColor: iconColor }]}
          onPress={() => navigation.navigate('QuizScreen', { icon })}
        >
          <Text style={styles.continueBtnText}>Continue to Quiz</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  headerBg: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: '#FFF', letterSpacing: 0.5 },

  scroll: { paddingHorizontal: 20, paddingBottom: 110, paddingTop: 20 },

  /* 3D model card */
  modelCard: {
    width: '100%', height: 280,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: COLORS.bgSurface,
  },
  webview: { flex: 1, backgroundColor: 'transparent' },

  noModelBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: RADIUS.md, borderWidth: 1,
  },
  noModelText: { fontFamily: FONTS.semiBold, fontSize: 12 },

  /* Name */
  iconName: {
    fontFamily: FONTS.bold, fontSize: 26, color: COLORS.text,
    textAlign: 'center', marginBottom: 6, letterSpacing: -0.3,
  },
  iconTagline: {
    fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted,
    textAlign: 'center', marginBottom: 22, lineHeight: 19,
  },

  /* Info card */
  infoCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
    marginBottom: 16,
    ...SHADOW.card,
  },

  sectionLabel: {
    fontFamily: FONTS.bold, fontSize: 11,
    letterSpacing: 1.6, marginBottom: 10,
  },
  bodyText: {
    fontFamily: FONTS.regular, fontSize: 14,
    color: COLORS.textSub, lineHeight: 22,
  },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 20 },

  /* Bottom button */
  bottomNav: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  continueBtn: {
    flexDirection: 'row', height: 56, borderRadius: RADIUS.md,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
  },
  continueBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: '#FFF', letterSpacing: 0.8 },
});
