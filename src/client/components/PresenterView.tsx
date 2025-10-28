import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePresenterActions } from '../hooks/useGameActions';
import { LoadingSpinner } from './LoadingScreen';
import { GameTimer } from './GameTimer';
import { 
  getPhraseCategories, 
  getPhrasesDatabase, 
  type PhraseCategory, 
  type PhraseData 
} from '../../shared/utils/phrases';

// Emoji data organized by categories
const EMOJI_CATEGORIES = {
  'smileys': {
    name: 'Smileys & People',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕']
  },
  'animals': {
    name: 'Animals & Nature',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️']
  },
  'food': {
    name: 'Food & Drink',
    emojis: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯']
  },
  'activities': {
    name: 'Activities',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️‍♀️', '🏋️', '🏋️‍♂️', '🤼‍♀️', '🤼', '🤼‍♂️', '🤸‍♀️', '🤸', '🤸‍♂️', '⛹️‍♀️', '⛹️', '⛹️‍♂️', '🤺', '🤾‍♀️', '🤾', '🤾‍♂️', '🏌️‍♀️', '🏌️', '🏌️‍♂️', '🏇', '🧘‍♀️', '🧘', '🧘‍♂️', '🏄‍♀️', '🏄', '🏄‍♂️', '🏊‍♀️', '🏊', '🏊‍♂️', '🤽‍♀️', '🤽', '🤽‍♂️', '🚣‍♀️', '🚣', '🚣‍♂️', '🧗‍♀️', '🧗', '🧗‍♂️', '🚵‍♀️', '🚵', '🚵‍♂️', '🚴‍♀️', '🚴', '🚴‍♂️', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️']
  },
  'travel': {
    name: 'Travel & Places',
    emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚁', '🛸', '✈️', '🛩️', '🛫', '🛬', '🪂', '💺', '🚀', '🛰️', '🚉', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚟', '🚠', '🚡', '⛴️', '🚤', '🛥️', '🛳️', '⛵', '🚢', '⚓', '⛽', '🚧', '🚨', '🚥', '🚦', '🛑', '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🛖', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🛕', '🕍', '⛩️', '🕋']
  },
  'objects': {
    name: 'Objects',
    emojis: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪓', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🪣', '🧽', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🪆', '🖼️', '🪞', '🪟', '🛍️', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️', '🪧', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒️', '🗓️', '📅', '📆', '📇', '🗃️', '🗳️', '🗄️', '📋', '📌', '📍', '📎', '🖇️', '📏', '📐', '✂️', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇️', '📐', '📏', '🧮', '📝', '✏️', '✒️', '🖋️', '🖊️', '🖌️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓']
  },
  'symbols': {
    name: 'Symbols',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🛗', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '⚧️', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '🟰', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '👁️‍🗨️', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧']
  }
} as const;

type EmojiCategoryKey = keyof typeof EMOJI_CATEGORIES;

export const PresenterView: React.FC = () => {
  const { 
    submitEmojis, 
    canSubmitEmojis, 
    currentPhrase, 
    loading, 
    error, 
    clearError 
  } = usePresenterActions();

  // State for phrase selection
  const [selectedCategory, setSelectedCategory] = useState<PhraseCategory | 'all'>('all');
  const [selectedPhrase, setSelectedPhrase] = useState<PhraseData | null>(null);
  const [showPhraseSelection, setShowPhraseSelection] = useState(true);

  // State for emoji picker
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState<EmojiCategoryKey>('smileys');
  const [emojiSearchQuery, setEmojiSearchQuery] = useState('');
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Get phrases database
  const phrasesDatabase = getPhrasesDatabase();
  const phraseCategories = getPhraseCategories();

  // Filter phrases based on selected category
  const filteredPhrases = useMemo(() => {
    if (selectedCategory === 'all') {
      const allPhrases: PhraseData[] = [];
      phraseCategories.forEach(category => {
        allPhrases.push(...(phrasesDatabase[category] || []));
      });
      return allPhrases;
    }
    return phrasesDatabase[selectedCategory] || [];
  }, [selectedCategory, phrasesDatabase, phraseCategories]);

  // Filter emojis based on search query
  const filteredEmojis = useMemo(() => {
    const categoryEmojis = EMOJI_CATEGORIES[selectedEmojiCategory].emojis;
    if (!emojiSearchQuery.trim()) {
      return categoryEmojis;
    }
    
    // Enhanced search with emoji descriptions/keywords
    const searchTerm = emojiSearchQuery.toLowerCase().trim();
    return categoryEmojis.filter(emoji => {
      // Basic emoji matching
      if (emoji.includes(searchTerm)) return true;
      
      // Enhanced keyword matching for common emojis
      const emojiKeywords: Record<string, string[]> = {
        '😀': ['happy', 'smile', 'joy'],
        '😢': ['sad', 'cry', 'tear'],
        '❤️': ['love', 'heart', 'red'],
        '🐶': ['dog', 'puppy', 'pet'],
        '🍕': ['pizza', 'food', 'italian'],
        '🏠': ['house', 'home', 'building'],
        '🚗': ['car', 'vehicle', 'drive'],
        '⚽': ['soccer', 'football', 'ball', 'sport'],
        // Add more as needed
      };
      
      const keywords = emojiKeywords[emoji] || [];
      return keywords.some(keyword => keyword.includes(searchTerm));
    });
  }, [selectedEmojiCategory, emojiSearchQuery]);

  // Handle phrase selection
  const handlePhraseSelect = useCallback((phrase: PhraseData) => {
    setSelectedPhrase(phrase);
    setShowPhraseSelection(false);
    setShowEmojiPicker(true);
    clearError();
  }, [clearError]);

  // Handle emoji selection
  const handleEmojiSelect = useCallback((emoji: string) => {
    if (selectedEmojis.length < 20) { // Max 20 emojis
      setSelectedEmojis(prev => [...prev, emoji]);
    }
  }, [selectedEmojis.length]);

  // Remove emoji from sequence
  const handleEmojiRemove = useCallback((index: number) => {
    setSelectedEmojis(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Clear all emojis
  const handleClearEmojis = useCallback(() => {
    setSelectedEmojis([]);
  }, []);

  // Submit emoji sequence
  const handleSubmitEmojis = useCallback(async () => {
    if (selectedEmojis.length === 0) {
      return;
    }
    
    try {
      await submitEmojis(selectedEmojis);
      // Reset state after successful submission
      setSelectedPhrase(null);
      setSelectedEmojis([]);
      setShowPhraseSelection(true);
      setShowEmojiPicker(false);
    } catch (err) {
      // Error is handled by the hook
      console.error('Failed to submit emojis:', err);
    }
  }, [selectedEmojis, submitEmojis]);

  // Go back to phrase selection
  const handleBackToPhrase = useCallback(() => {
    setShowEmojiPicker(false);
    setShowPhraseSelection(true);
    setSelectedEmojis([]);
  }, []);

  // Use current phrase if available (from game state)
  useEffect(() => {
    if (currentPhrase && !selectedPhrase) {
      const phraseData: PhraseData = {
        id: currentPhrase.id,
        text: currentPhrase.text,
        difficulty: currentPhrase.difficulty,
        ...(currentPhrase.hints && { hints: currentPhrase.hints })
      };
      setSelectedPhrase(phraseData);
      setShowPhraseSelection(false);
      setShowEmojiPicker(true);
    }
  }, [currentPhrase, selectedPhrase]);

  return (
    <div className="space-y-6">
      {/* Timer Component */}
      <GameTimer />
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            🎭 You're the Presenter!
          </h2>
          <p className="text-gray-600">
            {showPhraseSelection 
              ? "Choose a phrase and represent it with emojis for others to guess."
              : "Build your emoji sequence to represent the phrase."
            }
          </p>
        </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Phrase Selection */}
      {showPhraseSelection && (
        <div className="space-y-6">
          {/* Category Filter */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Choose Category
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Categories
              </button>
              {phraseCategories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Phrases List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Select Phrase
              </h3>
              <span className="text-sm text-gray-500">
                {filteredPhrases.length} available
              </span>
            </div>
            
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredPhrases.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📝</div>
                  <p>No phrases found in this category</p>
                  <p className="text-sm mt-1">Try selecting "All Categories"</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  {filteredPhrases.map((phrase, index) => (
                    <button
                      key={phrase.id}
                      onClick={() => handlePhraseSelect(phrase)}
                      className={`text-left p-4 border-b border-r border-gray-200 hover:bg-blue-50 transition-colors ${
                        index % 2 === 1 ? 'md:border-r-0' : ''
                      } ${
                        index >= filteredPhrases.length - 2 ? 'border-b-0' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-gray-900 flex-1 mr-2">
                          {phrase.text}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          phrase.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          phrase.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {phrase.difficulty}
                        </span>
                      </div>
                      {phrase.hints && phrase.hints.length > 0 && (
                        <div className="text-sm text-gray-500">
                          💡 {phrase.hints.join(', ')}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && selectedPhrase && (
        <div className="space-y-6">
          {/* Selected Phrase Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Your Phrase:</h3>
                <p className="text-lg font-bold text-blue-800">{selectedPhrase.text}</p>
                {selectedPhrase.hints && selectedPhrase.hints.length > 0 && (
                  <p className="text-sm text-blue-600 mt-1">
                    Hints: {selectedPhrase.hints.join(', ')}
                  </p>
                )}
              </div>
              <button
                onClick={handleBackToPhrase}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                Change Phrase
              </button>
            </div>
          </div>

          {/* Emoji Sequence Builder */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Your Emoji Sequence
              </h3>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${
                  selectedEmojis.length >= 20 ? 'text-red-600' : 
                  selectedEmojis.length >= 15 ? 'text-yellow-600' : 'text-gray-600'
                }`}>
                  {selectedEmojis.length}/20
                </span>
                {selectedEmojis.length > 0 && (
                  <button
                    onClick={handleClearEmojis}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
            
            <div className="min-h-20 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50">
              {selectedEmojis.length === 0 ? (
                <div className="text-center py-4">
                  <div className="text-4xl mb-2">👆</div>
                  <p className="text-gray-500">
                    Select emojis below to build your sequence
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Click emojis to add them here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {selectedEmojis.map((emoji, index) => (
                      <div
                        key={index}
                        className="relative group"
                      >
                        <button
                          onClick={() => handleEmojiRemove(index)}
                          className="text-3xl p-2 bg-white border-2 border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all shadow-sm group-hover:scale-105"
                          title={`Remove ${emoji} (position ${index + 1})`}
                        >
                          {emoji}
                        </button>
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          ×
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      Preview: {selectedEmojis.join(' ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {selectedEmojis.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={handleSubmitEmojis}
                  disabled={!canSubmitEmojis || loading}
                  className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium transition-colors"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="small" color="gray" />
                      <span className="ml-2">Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span className="mr-2">🚀</span>
                      Submit Emoji Sequence
                    </>
                  )}
                </button>
                
                <p className="text-xs text-gray-500 text-center mt-2">
                  Once submitted, other players will see your emojis and start guessing!
                </p>
              </div>
            )}
          </div>

          {/* Emoji Search */}
          <div>
            <div className="relative">
              <input
                type="text"
                placeholder="Search emojis (e.g., 'happy', 'food', 'car')..."
                value={emojiSearchQuery}
                onChange={(e) => setEmojiSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                🔍
              </div>
              {emojiSearchQuery && (
                <button
                  onClick={() => setEmojiSearchQuery('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
            {emojiSearchQuery && filteredEmojis.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                No emojis found for "{emojiSearchQuery}". Try different keywords.
              </p>
            )}
          </div>

          {/* Emoji Category Tabs */}
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => (
                <button
                  key={key}
                  onClick={() => setSelectedEmojiCategory(key as EmojiCategoryKey)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedEmojiCategory === key
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* Emoji Grid */}
            <div className="border border-gray-200 rounded-lg bg-gray-50">
              <div className="p-3 border-b border-gray-200 bg-gray-100 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">
                    {EMOJI_CATEGORIES[selectedEmojiCategory].name}
                  </h4>
                  <span className="text-sm text-gray-500">
                    {filteredEmojis.length} emoji{filteredEmojis.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 gap-1 max-h-64 overflow-y-auto p-4">
                {filteredEmojis.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🔍</div>
                    <p>No emojis found</p>
                  </div>
                ) : (
                  filteredEmojis.map((emoji, index) => (
                    <button
                      key={index}
                      onClick={() => handleEmojiSelect(emoji)}
                      disabled={selectedEmojis.length >= 20}
                      className="text-2xl p-2 hover:bg-white hover:shadow-sm hover:scale-110 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                      title={`Add ${emoji} (${selectedEmojis.length}/20)`}
                    >
                      {emoji}
                    </button>
                  ))
                )}
              </div>
              
              {selectedEmojis.length >= 20 && (
                <div className="p-3 border-t border-gray-200 bg-yellow-50">
                  <p className="text-sm text-yellow-800 text-center">
                    ⚠️ Maximum 20 emojis reached. Remove some to add more.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
