import React, {useCallback} from 'react'
import {Image as RNImage, StyleSheet, useColorScheme, View} from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import Svg, {Path, type SvgProps} from 'react-native-svg'
import {Image} from 'expo-image'

// @ts-ignore
import forumHietzingClaimPointer from '../assets/forum_hietzing_claim.png'
// @ts-ignore
// @ts-ignore
const forumHietzingClaimUri = RNImage.resolveAssetSource(
  forumHietzingClaimPointer,
).uri

export const Logo = React.forwardRef(function LogoImpl(props: SvgProps, ref) {
  const width = 1000
  const height = width * (67 / 64)
  return (
    <Svg
      fill="none"
      // @ts-ignore it's fiiiiine
      ref={ref}
      viewBox="0 0 64 66"
      style={[{width, height}, props.style]}>
      <Path
        fill={props.fill || '#fff'}
        d="M13.873 3.77C21.21 9.243 29.103 20.342 32 26.3v15.732c0-.335-.13.043-.41.858-1.512 4.414-7.418 21.642-20.923 7.87-7.111-7.252-3.819-14.503 9.125-16.692-7.405 1.252-15.73-.817-18.014-8.93C1.12 22.804 0 8.431 0 6.488 0-3.237 8.579-.18 13.873 3.77ZM50.127 3.77C42.79 9.243 34.897 20.342 32 26.3v15.732c0-.335.13.043.41.858 1.512 4.414 7.418 21.642 20.923 7.87 7.111-7.252 3.819-14.503-9.125-16.692 7.405 1.252 15.73-.817 18.014-8.93C62.88 22.804 64 8.431 64 6.488 64-3.237 55.422-.18 50.127 3.77Z"
      />
    </Svg>
  )
})

type Props = {
  isReady: boolean
}

export function Splash(props: React.PropsWithChildren<Props>) {
  'use no memo'
  const insets = useSafeAreaInsets()
  const intro = useSharedValue(0)
  const outroLogo = useSharedValue(0)
  const outroApp = useSharedValue(0)
  const outroAppOpacity = useSharedValue(0)
  const [isAnimationComplete, setIsAnimationComplete] = React.useState(false)
  const [isImageLoaded] = React.useState(true)
  const [isLayoutReady, setIsLayoutReady] = React.useState(false)
  const [reduceMotion, _setReduceMotion] = React.useState<boolean | undefined>(
    false,
  )
  const isReady =
    props.isReady &&
    isImageLoaded &&
    isLayoutReady &&
    reduceMotion !== undefined

  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === 'dark'

  const logoAnimation = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(intro.get(), [0, 1], [0.8, 1], 'clamp'),
        },
        {
          scale: interpolate(
            outroLogo.get(),
            [0, 0.08, 1],
            [1, 0.8, 500],
            'clamp',
          ),
        },
      ],
      opacity: interpolate(intro.get(), [0, 1], [0, 1], 'clamp'),
    }
  })
  const reducedLogoAnimation = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(intro.get(), [0, 1], [0.8, 1], 'clamp'),
        },
      ],
      opacity: interpolate(intro.get(), [0, 1], [0, 1], 'clamp'),
    }
  })

  const logoWrapperAnimation = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        outroAppOpacity.get(),
        [0, 0.1, 0.2, 1],
        [1, 1, 0, 0],
        'clamp',
      ),
    }
  })

  const appAnimation = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(outroApp.get(), [0, 1], [1.1, 1], 'clamp'),
        },
      ],
      opacity: interpolate(
        outroAppOpacity.get(),
        [0, 0.1, 0.2, 1],
        [0, 0, 1, 1],
        'clamp',
      ),
    }
  })

  const _onFinish = useCallback(() => setIsAnimationComplete(true), [])
  const onLayout = useCallback(() => setIsLayoutReady(true), [])

  const logoAnimations =
    reduceMotion === true ? reducedLogoAnimation : logoAnimation
  // special off-spec color for dark mode

  return (
    <View style={{flex: 1}} onLayout={onLayout}>
      {!isAnimationComplete && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {backgroundColor: isDarkMode ? '#0f172a' : '#ffffff'},
          ]}
        />
      )}

      {isReady && (
        <>
          <Animated.View style={[{flex: 1}, appAnimation]}>
            {props.children}
          </Animated.View>

          {!isAnimationComplete && (
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                logoWrapperAnimation,
                {
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  transform: [{translateY: -(insets.top / 2)}, {scale: 0.1}], // scale from 1000px to 100px
                },
              ]}>
              <Animated.View style={[logoAnimations]}>
                <Image
                  source={{uri: forumHietzingClaimUri}}
                  style={{
                    width: '84%',
                    maxWidth: 390,
                    height: 130,
                    alignSelf: 'center',
                  }}
                  contentFit="contain"
                />
              </Animated.View>
            </Animated.View>
          )}
        </>
      )}
    </View>
  )
}
