import { useState, useEffect } from 'react';
import { Keyboard, Platform, Dimensions, KeyboardEvent } from 'react-native';

export function useModalKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [screenHeight, setScreenHeight] = useState(() => Dimensions.get('window').height);

  useEffect(() => {
    const dimSub = Dimensions.addEventListener('change', ({ window }) => {
      setScreenHeight(window.height);
    });

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    });

    return () => {
      dimSub?.remove();
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Safe maximum height for the modal container so it never goes off-screen
  const maxContentHeight = isKeyboardVisible
    ? Math.max(260, screenHeight - keyboardHeight - (Platform.OS === 'android' ? 60 : 40))
    : screenHeight * 0.88;

  // Safe bottom padding on Android dialog overlay to lift modal above keyboard
  const overlayKeyboardStyle = {
    paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0,
  };

  return {
    keyboardHeight,
    isKeyboardVisible,
    maxContentHeight,
    overlayKeyboardStyle,
  };
}
