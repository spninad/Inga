import { Stack } from 'expo-router';

export default function FormsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="screens/FormScannerScreen" 
        options={{ title: 'Scan Form' }} 
      />
      <Stack.Screen 
        name="screens/FormPreviewScreen" 
        options={{ title: 'Preview Form' }} 
      />
      <Stack.Screen 
        name="screens/ChoiceScreen" 
        options={{ title: 'Fill Form' }} 
      />
      <Stack.Screen 
        name="screens/ManualFormScreen" 
        options={{ title: 'Fill Form' }} 
      />
      {/* Voice chat screen temporarily disabled */}
      {/* <Stack.Screen 
        name="screens/VoiceChatScreen" 
        options={{ title: 'Fill by Voice' }} 
      /> */}
    </Stack>
  );
}
