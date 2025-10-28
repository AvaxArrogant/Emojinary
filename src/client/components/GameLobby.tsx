import React from 'react';
import { useGameActions, useGameStatus, useLeaderboard } from '../hooks/useGameActions';
import { LoadingSpinner } from './LoadingScreen';
import { useGame } from '../contexts/GameContext';
import { useConnectionState } from '../utils/connectionManager';

export const GameLobby: React.FC = () => {
  const { joinGame, startGame, loading, error } = useGameActions();
  const { 
    playerCount, 
    canStartGame, 
    isCurrentUserModerator, 
    gameState 
  } = useGameStatus();
  const { players } = useLeaderboard();
  const { currentUser } = useGame();
  const { isConnected: connected, connectionQuality } = useConnectionState();

  const isUserInGame = currentUser && players.some(p => p.id === currentUser.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎭 Emojirades
          </h1>
          <p className="text-lg text-gray-600">
            Guess the phrase from emojis! A fun multiplayer game for Reddit.
          </p>
          
          {/* Connection Status Indicator */}
          {!connected && (
            <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
              Connection Issues
            </div>
          )}
          {connected && connectionQuality === 'poor' && (
            <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
              Poor Connection
            </div>
          )}
          {connected && connectionQuality === 'good' && (
            <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Connected
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Game Info & Actions */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Game Lobby
            </h2>
            
            <div className="space-y-4">
              {/* Game Status */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    canStartGame 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {canStartGame ? 'Ready to Start' : 'Waiting for Players'}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">Players:</span>
                  <span className="text-gray-700">{playerCount}/8</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">Min to Start:</span>
                  <span className="text-gray-700">2 players</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Game ID:</span>
                  <span className="text-xs text-gray-500 font-mono">
                    {gameState?.id?.slice(-8) || 'Loading...'}
                  </span>
                </div>
              </div>

              {/* Game Rules */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">How to Play:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Players take turns as the presenter</li>
                  <li>• Presenter gets a phrase and represents it with emojis</li>
                  <li>• Other players guess the phrase</li>
                  <li>• First correct guess wins the round!</li>
                  <li>• Each round lasts 2 minutes</li>
                </ul>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-red-600 mr-2">⚠️</span>
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {!isUserInGame ? (
                  <button
                    onClick={joinGame}
                    disabled={loading || !connected || playerCount >= 8}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium transition-colors"
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="small" color="gray" />
                        <span className="ml-2">Joining...</span>
                      </>
                    ) : playerCount >= 8 ? (
                      <>
                        <span className="mr-2">🚫</span>
                        Game Full
                      </>
                    ) : !connected ? (
                      <>
                        <span className="mr-2">⚠️</span>
                        Connection Required
                      </>
                    ) : (
                      <>
                        <span className="mr-2">🎮</span>
                        Join Game
                      </>
                    )}
                  </button>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-center text-green-800">
                      <span className="mr-2">✅</span>
                      You're in the game!
                    </div>
                  </div>
                )}

                {isCurrentUserModerator && isUserInGame && (
                  <button
                    onClick={startGame}
                    disabled={!canStartGame || loading || !connected}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium transition-colors"
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="small" color="gray" />
                        <span className="ml-2">Starting...</span>
                      </>
                    ) : !connected ? (
                      <>
                        <span className="mr-2">⚠️</span>
                        Connection Required
                      </>
                    ) : !canStartGame ? (
                      <>
                        <span className="mr-2">⏳</span>
                        Need {Math.max(0, 2 - playerCount)} More Player{Math.max(0, 2 - playerCount) !== 1 ? 's' : ''}
                      </>
                    ) : (
                      <>
                        <span className="mr-2">🚀</span>
                        Start Game
                      </>
                    )}
                  </button>
                )}

                {isCurrentUserModerator && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500">
                      👑 You're the game moderator
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      You can start the game when ready
                    </p>
                  </div>
                )}
                
                {!isCurrentUserModerator && isUserInGame && (
                  <p className="text-xs text-gray-500 text-center">
                    Waiting for moderator to start the game...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Players List */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Players ({playerCount})
            </h2>
            
            <div className="space-y-3">
              {players.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">👥</div>
                  <p className="text-gray-500">No players yet</p>
                  <p className="text-sm text-gray-400">Be the first to join!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {players.map((player, index) => (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        player.id === currentUser?.id
                          ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="flex items-center mr-3">
                          {index === 0 && (
                            <span className="text-yellow-500 mr-2" title="Moderator">
                              👑
                            </span>
                          )}
                          <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                            player.isActive ? 'bg-green-500' : 'bg-gray-400'
                          }`} title={player.isActive ? 'Online' : 'Offline'} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {player.username}
                            {player.id === currentUser?.id && (
                              <span className="text-blue-600 ml-1 font-normal">(You)</span>
                            )}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span>Score: {player.score}</span>
                            {index === 0 && (
                              <span className="text-yellow-600">• Moderator</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="text-right">
                          <div className={`text-sm font-medium ${
                            player.isActive ? 'text-green-600' : 'text-gray-400'
                          }`}>
                            {player.isActive ? 'Online' : 'Offline'}
                          </div>
                          <div className="text-xs text-gray-400">
                            Joined {new Date(player.joinedAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Waiting for more players */}
              {playerCount > 0 && playerCount < 8 && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">➕</div>
                  <p className="text-sm text-gray-500">
                    Waiting for more players...
                  </p>
                  <p className="text-xs text-gray-400">
                    Up to 8 players can join
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-sm text-gray-500">
            Game ID: <span className="font-mono">{gameState?.id || 'Loading...'}</span>
          </p>
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
            <span>Max Players: 8</span>
            <span>•</span>
            <span>Round Duration: 2 minutes</span>
            <span>•</span>
            <span>Max Rounds: {gameState?.maxRounds || 5}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
