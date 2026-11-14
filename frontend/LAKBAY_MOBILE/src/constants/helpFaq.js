// Help & Support questions shown on Profile → Help & Support.
// Keep the numbers in line with the app: quiz XP (QuizScreen), AR XP
// (constants/rewards.js RARITY_XP), level curve (utils/levels.js), catch
// distances (CatchScreen) and the promotion flow (Promote / MyPromotions).

export const HELP_SECTIONS = [
  {
    key: 'start',
    title: 'Getting Started',
    icon: 'compass-outline',
    items: [
      {
        q: 'What is LAKBAY?',
        a: 'LAKBAY is a game for discovering the culture and heritage of Zamboanga City. You earn XP by scanning QR codes at cultural spots, finding artworks in the National Museum with Augmented Reality (AR), catching cultural treasures on a GPS hunt, and answering trivia.',
      },
      {
        q: 'What do I need to play?',
        a: 'An internet connection, your phone camera (for QR and AR) and location turned on (for the map and Catch). Allow LAKBAY to use the camera and location when your phone asks.',
      },
      {
        q: 'Who is the guide that talks to me?',
        a: 'He is your LAKBAY tour guide. He explains each step and tells the story of every place you discover. Tap the play button in his speech bubble to hear him again, or Skip to close him. If you cannot hear him, turn up your media volume.',
      },
      {
        q: 'The app is slow the first time I open it.',
        a: 'The LAKBAY server goes to sleep when nobody is using it and needs a few seconds to wake up. Wait a moment, then pull down on the page to refresh.',
      },
    ],
  },
  {
    key: 'qr',
    title: 'QR Scanning',
    icon: 'qr-code-outline',
    items: [
      {
        q: 'How do I scan a QR code?',
        a: 'On Explore, choose the QR quest and point your camera at a LAKBAY QR code posted at a cultural spot. Hold the phone steady until it reads the code. The place story then opens and the guide tells it to you.',
      },
      {
        q: 'How much XP do I get for scanning?',
        a: 'Each place gives its own XP reward, shown on the place. You get it the first time you scan that place. Scanning it again lets you read the story again but gives no more XP.',
      },
      {
        q: 'It says the spot is locked.',
        a: 'Some places need a higher explorer level. Earn more XP from other places, AR, Catch and quizzes, then scan again once you reach the level shown.',
      },
      {
        q: 'My QR code does not scan.',
        a: 'Make sure there is enough light, the whole code is inside the frame and the code is not torn or covered. Only LAKBAY QR codes work. If it still fails, check your internet connection.',
      },
    ],
  },
  {
    key: 'ar',
    title: 'AR Museum Exhibit',
    icon: 'scan-outline',
    items: [
      {
        q: 'How does the AR exhibit work?',
        a: 'Open the AR quest inside the National Museum and pick your building (S2, S3 or S4). The guide introduces the galleries. Point your camera at a registered artwork or object and its 3D model appears on top of it while the guide describes it.',
      },
      {
        q: 'How much XP do AR discoveries give?',
        a: 'It depends on rarity: Common 40 XP, Rare 70 XP, Mythical 100 XP and Legendary 150 XP. You get the XP the first time you discover each one.',
      },
      {
        q: 'Nothing appears when I point at an artwork.',
        a: 'Not every piece in the museum is part of LAKBAY. Each building has its own set of items. Use the clue and the compass to find them, stand a little farther back so the whole piece fits on screen, and avoid glare on the glass.',
      },
      {
        q: 'The 3D model takes long to show.',
        a: 'Models download the first time you see them, so a slow connection can take a while. A floating viewer shows the model in the meantime.',
      },
    ],
  },
  {
    key: 'catch',
    title: 'Catch Hunt',
    icon: 'locate-outline',
    items: [
      {
        q: 'How do I catch a cultural treasure?',
        a: 'Walk toward a Catch spot. Within 50 m the app tells you it is nearby. Within 10 m a treasure chest appears, and within 5 m you can tap it to open it. Then tap Catch It and swipe up on the net to throw it at the model.',
      },
      {
        q: 'My net keeps missing.',
        a: 'The model sways left and right. Swipe straight up and fast when it is in front of the net. Throwing while the yellow ring is small gives a better throw message.',
      },
      {
        q: 'How much XP does a catch give?',
        a: 'Each Catch spot has its own reward, usually 150 XP. You get it the first time you catch that treasure. You can catch it again for fun, but with no extra XP.',
      },
      {
        q: 'The arrow or distance looks wrong.',
        a: 'GPS is less accurate indoors and near tall buildings. Step outside into an open area, wait a few seconds, and move your phone in a figure-eight to fix the compass.',
      },
    ],
  },
  {
    key: 'xp',
    title: 'XP, Levels & Quizzes',
    icon: 'trophy-outline',
    items: [
      {
        q: 'How do levels work?',
        a: 'Level 1 needs 100 XP. After that each level needs a bit more: 150, 175, 200, 250 XP and so on. Your progress is shown on your Profile.',
      },
      {
        q: 'How do quizzes give XP?',
        a: 'Every correct answer gives +10 XP and every wrong answer takes away 5 XP. New players with 0 XP are protected, so a wrong answer costs nothing at the start.',
      },
      {
        q: 'What is the daily streak?',
        a: 'Open LAKBAY every day and claim your streak reward on Explore for +10 XP. If you miss more than a day, the streak starts over. The streak is kept on this phone.',
      },
      {
        q: 'How does the leaderboard work?',
        a: 'Players are ranked by total XP. Others only see your explorer name, character and XP, never your real name or email.',
      },
      {
        q: 'What are badges and avatar items?',
        a: 'Badges and avatar decorations (hats, frames, pins and backdrops) unlock as your XP grows. See them in My Journey and choose decorations in Edit Profile & Avatar.',
      },
    ],
  },
  {
    key: 'coins',
    title: 'Coins & Promotions',
    icon: 'storefront-outline',
    items: [
      {
        q: 'What are coins for?',
        a: 'Coins are used to publish your place or business promotion on the LAKBAY map. They are not needed for exploring or earning XP.',
      },
      {
        q: 'How do I buy coins?',
        a: 'Go to Store, tap a coin pack and pay with the QR Ph code using GCash, Maya or any bank app that scans QR Ph. The coins are added once the payment is confirmed.',
      },
      {
        q: 'I paid but did not receive my coins.',
        a: 'Keep the payment window open and tap Check Payment Status. Confirmation can take a minute. Do not pay the same QR code twice.',
      },
      {
        q: 'How do I promote a place or business?',
        a: 'Open Promote, add a photo, a description and the location on the map, then submit. The LAKBAY team reviews it first. Once approved, publish it from My Promotions using coins and it appears on the map for everyone.',
      },
      {
        q: 'Why was my promotion rejected?',
        a: 'The reason is shown in My Promotions. Fix the photo, description or location and submit a new promotion.',
      },
    ],
  },
  {
    key: 'account',
    title: 'Account & Privacy',
    icon: 'person-circle-outline',
    items: [
      {
        q: 'I did not get my verification code.',
        a: 'Check your spam or promotions folder. Codes last 10 minutes. You can ask for a new one after a minute.',
      },
      {
        q: 'I forgot my password.',
        a: 'On the login page tap Forgot password?, enter your email and use the 6-digit code we send you to set a new password.',
      },
      {
        q: 'How do I change my password?',
        a: 'Go to Profile → Privacy & Security. Enter your current password and the new one. Your other signed-in devices will be signed out.',
      },
      {
        q: 'How do I change my explorer name or avatar?',
        a: 'Go to Profile → Edit Profile & Avatar. Explorer names must be unique.',
      },
      {
        q: 'Will I lose my progress if I log out or change phones?',
        a: 'No. Your XP, scans and AR and Catch collections are saved to your account and come back when you log in. Only the daily streak stays on the old phone.',
      },
      {
        q: 'What data does LAKBAY keep?',
        a: 'See Profile → Privacy & Security for how LAKBAY uses your account details, location and camera.',
      },
    ],
  },
];
