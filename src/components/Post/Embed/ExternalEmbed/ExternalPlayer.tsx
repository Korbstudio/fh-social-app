import React from 'react'
import {
  ActivityIndicator,
  type GestureResponderEvent,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,Platform} from 'react-native'
import Animated, {
  measure,
  runOnJS,
  useAnimatedRef,
  useFrameCallback,
} from 'react-native-reanimated'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {WebView} from 'react-native-webview'
import {Image} from 'expo-image'
import {type AppBskyEmbedExternal} from '@atproto/api'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {useNavigation} from '@react-navigation/native'

import {type NavigationProp} from '#/lib/routes/types'
import {
  type EmbedPlayerParams,
  getPlayerAspect,
} from '#/lib/strings/embed-player'
import {useExternalEmbedsPrefs} from '#/state/preferences'
import {EventStopper} from '#/view/com/util/EventStopper'
import {atoms as a, useTheme} from '#/alf'
import {useDialogControl} from '#/components/Dialog'
import {EmbedConsentDialog} from '#/components/dialogs/EmbedConsent'
import {Fill} from '#/components/Fill'
import {PlayButtonIcon} from '#/components/video/PlayButtonIcon'
import {IS_NATIVE} from '#/env'

interface ShouldStartLoadRequest {
  url: string
}

// This renders the overlay when the player is either inactive or loading as a separate layer
function PlaceholderOverlay({
  isLoading,
  isPlayerActive,
  onPress,
}: {
  isLoading: boolean
  isPlayerActive: boolean
  onPress: (event: GestureResponderEvent) => void
}) {
  const {_} = useLingui()

  // If the player is active and not loading, we don't want to show the overlay.
  if (isPlayerActive && !isLoading) return null

  return (
    <View style={[a.absolute, a.inset_0, styles.overlayLayer]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={_(msg`Play Video`)}
        accessibilityHint={_(msg`Plays the video`)}
        onPress={onPress}
        style={[styles.overlayContainer]}>
        {!isPlayerActive ? (
          <PlayButtonIcon />
        ) : (
          <ActivityIndicator size="large" color="white" />
        )}
      </Pressable>
    </View>
  )
}

// This renders the webview/youtube player as a separate layer

function extractYouTubeId(url: string): string | undefined {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      return u.pathname.split('/').filter(Boolean)[0]
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch') return u.searchParams.get('v') || undefined
      const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)
      if (m) return m[1]
    }
  } catch {}
  return undefined
}

function extractVimeoId(url: string): string | undefined {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const m = u.pathname.match(/\/(?:video\/)?(\d+)/)
      if (m) return m[1]
    }
  } catch {}
  return undefined
}

function getWebEmbedUri(
  params: EmbedPlayerParams,
  link?: AppBskyEmbedExternal.ViewExternal,
): string {
  const candidates = [
    link?.uri,
    (link as any)?.href,
    (params as any)?.uri,
    (params as any)?.externalUri,
    (params as any)?.href,
    (params as any)?.playerUri,
  ].filter((v): v is string => typeof v === 'string' && v.length > 0)

  if (Platform.OS === 'web') {
    console.log('FH ExternalPlayer debug', {
      link,
      params,
      candidates,
    })
  }

  for (const raw of candidates) {
    const yt = extractYouTubeId(raw)
    if (yt) {
      return `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&playsinline=1&rel=0`
    }

    const vm = extractVimeoId(raw)
    if (vm) {
      return `https://player.vimeo.com/video/${vm}?autoplay=1`
    }
  }

  return params.playerUri
}


function Player({
  link,
  params,
  onLoad,
  isPlayerActive,
}: {
  link?: AppBskyEmbedExternal.ViewExternal
  isPlayerActive: boolean
  params: EmbedPlayerParams
  onLoad: () => void
}) {
  const onShouldStartLoadWithRequest = React.useCallback(
    (event: ShouldStartLoadRequest) =>
      event.url === params.playerUri ||
      (params.source.startsWith('youtube') &&
        event.url.includes('www.youtube.com')),
    [params.playerUri, params.source],
  )

  if (!isPlayerActive) return null

  if (Platform.OS === 'web') {
    return (
      <View style={[StyleSheet.absoluteFill, styles.playerLayer]}>
        <iframe
          src={getWebEmbedUri(params, link)}
          title="External video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-same-origin allow-scripts allow-popups allow-presentation"
          onLoad={onLoad}
          style={{
            width: '100%',
            height: '100%',
            border: '0',
            background: 'transparent',
          }}
        />
      </View>
    )
  }

  return (
    <WebView
      source={{uri: params.playerUri}}
      onLoadEnd={onLoad}
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction={false}
      onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
      style={[StyleSheet.absoluteFill, styles.playerLayer, styles.webview]}
    />
  )
}

// This renders the player area and handles the logic for when to show the player and when to show the overlay
export function ExternalPlayer({
  link,
  params,
}: {
  link: AppBskyEmbedExternal.ViewExternal
  params: EmbedPlayerParams
}) {
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const insets = useSafeAreaInsets()
  const windowDims = useWindowDimensions()
  const externalEmbedsPrefs = useExternalEmbedsPrefs()
  const consentDialogControl = useDialogControl()

  const [isPlayerActive, setPlayerActive] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)

  const aspect = React.useMemo(() => {
    return getPlayerAspect({
      type: params.type,
      width: windowDims.width,
      hasThumb: !!link.thumb,
    })
  }, [params.type, windowDims.width, link.thumb])

  const viewRef = useAnimatedRef()
  const frameCallback = useFrameCallback(() => {
    const measurement = measure(viewRef)
    if (!measurement) return

    const {height: winHeight, width: winWidth} = windowDims

    // Get the proper screen height depending on what is going on
    const realWinHeight = IS_NATIVE // If it is native, we always want the larger number
      ? winHeight > winWidth
        ? winHeight
        : winWidth
      : winHeight // On web, we always want the actual screen height

    const top = measurement.pageY
    const bot = measurement.pageY + measurement.height

    // We can use the same logic on all platforms against the screenHeight that we get above
    const isVisible = top <= realWinHeight - insets.bottom && bot >= insets.top

    if (!isVisible) {
      runOnJS(setPlayerActive)(false)
    }
  }, false) // False here disables autostarting the callback

  // watch for leaving the viewport due to scrolling
  React.useEffect(() => {
    // We don't want to do anything if the player isn't active
    if (!isPlayerActive) return

    // Interval for scrolling works in most cases, However, for twitch embeds, if we navigate away from the screen the webview will
    // continue playing. We need to watch for the blur event
    const unsubscribe = navigation.addListener('blur', () => {
      setPlayerActive(false)
    })

    // Start watching for changes
    frameCallback.setActive(true)

    return () => {
      unsubscribe()
      frameCallback.setActive(false)
    }
  }, [navigation, isPlayerActive, frameCallback])

  const onLoad = React.useCallback(() => {
    setIsLoading(false)
  }, [])

  const onPlayPress = React.useCallback(
    (event: GestureResponderEvent) => {
      // Prevent this from propagating upward on web
      event.preventDefault()

      if (externalEmbedsPrefs?.[params.source] === undefined) {
        consentDialogControl.open()
        return
      }

      setPlayerActive(true)
    },
    [externalEmbedsPrefs, consentDialogControl, params.source],
  )

  const onAcceptConsent = React.useCallback(() => {
    setPlayerActive(true)
  }, [])

  return (
    <>
      <EmbedConsentDialog
        control={consentDialogControl}
        source={params.source}
        onAccept={onAcceptConsent}
      />

      <Animated.View
        ref={viewRef}
        collapsable={false}
        style={[aspect, a.overflow_hidden]}>
        {link.thumb && (!isPlayerActive || isLoading) ? (
          <>
            <Image
              style={[a.flex_1]}
              source={{uri: link.thumb}}
              accessibilityIgnoresInvertColors
              loading="lazy"
            />
            <Fill
              style={[
                t.name === 'light' ? t.atoms.bg_contrast_975 : t.atoms.bg,
                {
                  opacity: 0.3,
                },
              ]}
            />
          </>
        ) : (
          <Fill
            style={[
              {
                backgroundColor:
                  t.name === 'light' ? t.palette.contrast_975 : 'black',
                opacity: 0.3,
              },
            ]}
          />
        )}
        <PlaceholderOverlay
          isLoading={isLoading}
          isPlayerActive={isPlayerActive}
          onPress={onPlayPress}
        />
        <Player
          isPlayerActive={isPlayerActive}
          params={params}
          onLoad={onLoad}
        />
      </Animated.View>
    </>
  )
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayLayer: {
    zIndex: 2,
  },
  playerLayer: {
    zIndex: 3,
  },
  webview: {
    backgroundColor: 'transparent',
  },
  gifContainer: {
    width: '100%',
    overflow: 'hidden',
  },
})
