import React, { useCallback, useState } from 'react';
import ErrorModal from './ErrorModal';

// Pick the modal's look from the title when the caller doesn't say.
function inferType(title = '', confirmBtn) {
  const t = String(title).toLowerCase();
  if (confirmBtn?.style === 'destructive') return 'error';
  if (/(error|failed|fail)/.test(t)) return 'error';
  if (/(missing|invalid|validation|pending|required)/.test(t)) return 'warning';
  if (/(success|🎉|published|submitted|updated|attached|done|complete)/.test(t)) return 'success';
  return 'info';
}

/**
 * Designed replacement for React Native's plain `Alert.alert`.
 *   const { dialog, showAlert } = useAppDialog();
 *   showAlert(title, message, buttons?, type?)   // same buttons shape as Alert.alert
 *   …and render {dialog} once in the screen.
 * One button → single action. Two buttons → the `style: 'cancel'` one (or the first)
 * becomes the outline button, the other the solid confirm button.
 */
export function useAppDialog() {
  const [state, setState] = useState({ visible: false });

  const showAlert = useCallback((title, message, buttons, type) => {
    const list = Array.isArray(buttons) && buttons.length ? buttons : [{ text: 'OK' }];
    const dual = list.length > 1;
    const cancelBtn = dual ? list.find((b) => b.style === 'cancel') || list[0] : null;
    const confirmBtn = dual ? list.find((b) => b !== cancelBtn) : list[0];
    setState({
      visible: true,
      title,
      message,
      type: type || inferType(title, confirmBtn),
      dual,
      cancelBtn,
      confirmBtn,
    });
  }, []);

  const hide = () => setState((s) => ({ ...s, visible: false }));

  const dialog = (
    <ErrorModal
      visible={!!state.visible}
      type={state.type}
      title={state.title}
      message={state.message}
      cancelLabel={state.dual ? state.cancelBtn?.text || 'Cancel' : state.confirmBtn?.text || 'OK'}
      confirmLabel={state.confirmBtn?.text || 'OK'}
      onConfirm={
        state.dual
          ? () => {
              hide();
              state.confirmBtn?.onPress?.();
            }
          : undefined
      }
      onClose={() => {
        hide();
        (state.dual ? state.cancelBtn : state.confirmBtn)?.onPress?.();
      }}
    />
  );

  return { dialog, showAlert };
}
