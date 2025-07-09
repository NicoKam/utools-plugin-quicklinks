import { pinyin } from 'pinyin-pro';

function genRegExpStrForWord(word: string, isInner = false): string {
  if (word.length === 0) {
    return '';
  }
  if (word.length < 2) {
    return `${word}?`;
  }
  return `(${isInner ? '?:' : ''}${word[0]}${genRegExpStrForWord(
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
  const wordAndSplit = sentence.split(/(\w+)/g);

  // 为每一个单词或 split 生成一个捕获
  const regExpStr = wordAndSplit
    .map((word, index) => {
      const isWord = index % 2 === 1;
      return isWord ? genRegExpStrForWord(word) : `(${[...word].join('?')})?`;
    })
    .join('');
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
        return pinyinArray.join(' ').replace(/ü/g, 'v');
      }
      [...value].forEach(() => {
        pinyinIndexMapping.push(charCount++);
      });
      if (index < pinyinSplit.length - 1) {
        pinyinIndexMapping.push(charCount);
      }
      return value;
    })
    .join(' ');

  const fn = genStringMatchFn(pinyinSentence);

  return (keyword) => {
    const match = fn(keyword);
    if (!match) {
      return null;
    }

    console.log('wkn-pinyinSentence', pinyinSentence, sentence);

    // 将匹配的结果映射回去
    return match.map(item => ({
      start: pinyinIndexMapping[item.start] ?? item.start,
      end: pinyinIndexMapping[item.end] ?? item.end,
    }));
  };
}
