// Shared obscenity matcher for the build script, the slang review script and tests.
import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from 'obscenity'

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
})

export const isProfane = (word) => matcher.hasMatch(word)
