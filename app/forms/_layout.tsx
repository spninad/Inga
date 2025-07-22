import { Stack } from 'expo-router';

export default function FormsLayout() {
  return (
    <Stack initialRouteName="screens/FormScannerScreen">
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
        options={{ title: 'Choose Input Method' }} 
      />
      <Stack.Screen 
        name="screens/ManualFormScreen" 
        options={{ title: 'Fill Manually' }} 
      />
      <Stack.Screen 
        name="screens/VoiceChatScreen" 
        options={{ title: 'Fill by Voice' }} 
      />
    </Stack>
  );
}
