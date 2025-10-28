import { context, reddit } from '@devvit/web/server';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  return await reddit.submitCustomPost({
    splash: {
      // Splash Screen Configuration
      appDisplayName: 'Emojirades',
      backgroundUri: 'default-splash.png',
      buttonLabel: 'Play Emojirades',
      description: 'A fun multiplayer guessing game using emojis!',
      heading: 'Welcome to Emojirades!',
      appIconUri: 'default-icon.png',
    },
    postData: {
      gameState: 'initial',
      score: 0,
    },
    subredditName: subredditName,
    title: 'Emojirades Game',
  });
};
