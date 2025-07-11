import { pinyin } from 'pinyin-pro';

function escapeWord(word: string) {
  return word.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
}

function genRegExpStrForWord(word: string, isInner = false): string {
  if (word.length === 0) {
    return '';
  }
  if (word.length < 2) {
    return `(${isInner ? '?:' : ''}${escapeWord(word)}?)?`;
  }
  return `(${isInner ? '?:' : ''}${escapeWord(word[0])}${genRegExpStrForWord(
    word.slice(1),
    true,
  )})?`;
}

export interface MatchStatus {
  start: number;
  end: number;
}

/**
 * 根据语句生成匹配函数
 */
export function genStringMatchFn(
  sentence: string,
): (keyword: string) => MatchStatus[] | null {
  // 拆分单词和 split
  const wordAndSplit = sentence.split(/(\w+|[\u4e00-\u9fa5])/g);

  // 为每一个单词或 split 生成一个捕获
  const regExpStr = wordAndSplit
    .map((word, index) => {
      const isWord = index % 2 === 1;
      return isWord
        ? genRegExpStrForWord(word)
        : `(${[...word].map(char => `${escapeWord(char)}?`).join('')})`;
    })
    .join('');
  try {
    // 生成正则表达式
    const regExp = new RegExp(`^${regExpStr}$`, 'i');

    return (keyword: string) => {
      const match = regExp.exec(keyword);
      if (!match) {
        return null;
      }

      const matchStatus: MatchStatus[] = [];
      let count = 0;
      wordAndSplit.forEach((word, index) => {
        // 检查是否匹配上了
        const isMatch = match[index + 1];
        if (isMatch) {
          matchStatus.push({
            start: count,
            end: count + isMatch.length - 1,
          });
        }
        count += word.length;
      });

      return matchStatus;
    };
  } catch (error) {
    console.error('生成正则表达式失败', error);
    return () => null;
  }
}

export function genChineseMatchFn(
  sentence: string,
): (keyword: string) => MatchStatus[] | null {
  // 先检查是否包含拼音
  const pinyinSplit = sentence.split(/([\u4e00-\u9fa5]+)/);
  if (pinyinSplit.length < 2) {
    // 不包含拼音
    return genStringMatchFn(sentence);
  }

  // 包含拼音，记录拼音到单词的下标映射
  const pinyinIndexMapping: number[] = [];

  let charCount = 0;
  const pinyinSentence = pinyinSplit
    .map((value, index) => {
      const isChinese = index % 2 === 1;
      if (isChinese) {
        const pinyinArray = pinyin(value, {
          type: 'array',
          toneType: 'none',
          removeNonZh: true,
        });
        // pinyinArr 长度应该和 value 长度相同
        pinyinArray.forEach((pinyin, index) => {
          [...pinyin].forEach(() => {
            pinyinIndexMapping.push(charCount);
          });
          if (index < pinyinArray.length - 1) {
            pinyinIndexMapping.push(charCount);
          }
          charCount++;
        });
        return pinyinArray.join('`').replace(/ü/g, 'v');
      }
      [...value].forEach(() => {
        pinyinIndexMapping.push(charCount++);
      });
      // if (index < pinyinSplit.length - 1) {
      //   pinyinIndexMapping.push(charCount);
      // }
      return value;
    })
    .join('');

  // 拼音匹配
  const pinyinMatchFn = genStringMatchFn(pinyinSentence);
  // 原始匹配
  const originMatchFn = genStringMatchFn(sentence);

  return (keyword) => {
    const match = pinyinMatchFn(keyword);
    if (!match) {
      // 未能通过拼音
      return originMatchFn(keyword);
    }

    // 将匹配的结果映射回去
    return match.map(item => ({
      start: pinyinIndexMapping[item.start] ?? item.start,
      end: pinyinIndexMapping[item.end] ?? item.end,
    }));
  };
}
