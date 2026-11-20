import React, { useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';

const HTML_ESCAPE = { '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;', '&': '&amp;' };
const escapeAttr = (s) => String(s).replace(/["'<>&]/g, (c) => HTML_ESCAPE[c]);

function viewerHTML(modelUrl) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html,body { width:100%; height:100%; background:transparent; overflow:hidden; }
    model-viewer { width:100%; height:100%; --progress-bar-color:transparent; }
  </style>
</head>
<body>
  <model-viewer src="${escapeAttr(modelUrl)}" auto-rotate camera-controls touch-action="pan-y"
    bounds="tight" exposure="1.2" shadow-intensity="1" interaction-prompt="none"
    style="width:100%;height:100%;background:transparent;"></model-viewer>
  <script>
    var mv = document.querySelector('model-viewer');
    mv.addEventListener('load', function () { window.ReactNativeWebView.postMessage('loaded'); });
    mv.addEventListener('error', function () { window.ReactNativeWebView.postMessage('error'); });
  </script>
</body>
</html>`;
}

// Spinning, draggable 3D model (GLB) shown on a details page. Render it only when a model exists.
export default function ModelViewerCard({ modelUrl, title = '3D Model', height = 260 }) {
  const html = useMemo(() => (modelUrl ? viewerHTML(modelUrl) : null), [modelUrl]);
  const [status, setStatus] = useState('loading');
  if (!html) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Ionicons name="cube" size={16} color={COLORS.teal} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.hint}>Drag to rotate</Text>
      </View>
      <View style={[styles.stage, { height }]}>
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={styles.webview}
          javaScriptEnabled
          scrollEnabled={false}
          nestedScrollEnabled
          onMessage={(e) => setStatus(e.nativeEvent.data === 'error' ? 'error' : 'ready')}
          onError={() => setStatus('error')}
        />
        {status === 'loading' && (
          <View style={styles.overlay} pointerEvents="none">
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.overlayText}>Loading 3D model…</Text>
          </View>
        )}
        {status === 'error' && (
          <View style={styles.overlay} pointerEvents="none">
            <Ionicons name="alert-circle-outline" size={22} color={COLORS.textMuted} />
            <Text style={styles.overlayText}>The 3D model could not be loaded.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 18 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  title: { flex: 1, fontFamily: FONTS.bold, fontSize: 17, color: COLORS.navy },
  hint: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textMuted },
  stage: {
    borderRadius: 18, overflow: 'hidden',
    backgroundColor: COLORS.bgCardAlt, borderWidth: 1, borderColor: COLORS.border,
  },
  webview: { flex: 1, backgroundColor: 'transparent' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 8 },
  overlayText: { fontFamily: FONTS.medium, fontSize: 12.5, color: COLORS.textMuted },
});
