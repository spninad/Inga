import React from 'react';
import renderer, { act } from 'react-test-renderer';
import FormPreviewScreen from '../FormPreviewScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({
    imageUri: 'file:///test/image.jpg',
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Icon',
}));

jest.mock('../../services/FormProcessingService.ts', () => ({
  processForm: jest.fn(() => Promise.resolve([])),
}));

describe('<FormPreviewScreen />', () => {
  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(<FormPreviewScreen />);
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });
});
