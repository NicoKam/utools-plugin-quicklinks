import type { Extension } from '@codemirror/state';
import { ReloadOutlined } from '@ant-design/icons';
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { Compartment, EditorState, RangeSet, StateEffect } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { Decoration, EditorView, gutterLineClass, GutterMarker, lineNumbers } from '@codemirror/view';
import { Button, Spin } from 'antd';
import cn from 'classnames';
import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { validateCodeLocation } from '../../editorSettings';
import { codeMirrorLanguageName, loadCodeMirrorLanguage } from '../../utils/codeMirrorLanguage';
import { createLatestAsyncLoader } from '../../utils/latestAsyncLoader';
import useDarkThemeMode from '../../utils/useDarkThemeMode';
import styles from './CodePreview.module.less';

export interface CodePreviewProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  value: string;
}

interface Preview {
  value: string;
  revision: number;
  content: string;
  truncated: boolean;
  error?: string;
}

class BookmarkLineMarker extends GutterMarker {
  elementClass = 'cm-bookmarkLineGutter';
}

const bookmarkLineMarker = new BookmarkLineMarker();

function bookmarkLineExtensions(state: EditorState, line?: number): Extension[] {
  if (!line || line > state.doc.lines)
    return [];
  const position = state.doc.line(line).from;
  return [
    EditorView.decorations.of(Decoration.set([
      Decoration.line({ class: 'cm-bookmarkLine' }).range(position),
    ])),
    gutterLineClass.of(RangeSet.of([bookmarkLineMarker.range(position)])),
  ];
}

function previewTheme(darkMode: boolean) {
  return EditorView.theme({
    '&': {
      height: '100%',
      backgroundColor: 'var(--code-background)',
      color: 'var(--text-color)',
      fontSize: '12px',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'Menlo, Monaco, Consolas, monospace',
      lineHeight: '20px',
    },
    '.cm-content': {
      padding: '12px 0',
      minWidth: 'max-content',
    },
    '.cm-line': {
      padding: '0 12px',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--code-gutter-background)',
      color: 'var(--code-gutter-text)',
      borderRight: '1px solid var(--border-color)',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      minWidth: '44px',
      padding: '0 10px 0 6px',
    },
    '.cm-gutterElement.cm-bookmarkLineGutter': {
      color: 'var(--blue)',
      backgroundColor: 'var(--code-line-highlight)',
      boxShadow: 'inset 2px 0 var(--blue)',
    },
    '.cm-line.cm-bookmarkLine': {
      backgroundColor: 'var(--code-line-highlight)',
    },
    '.cm-cursor': {
      borderLeftColor: 'transparent',
    },
    '&.cm-focused': {
      outline: 'none',
    },
  }, { dark: darkMode });
}

function CodePreview(props: CodePreviewProps) {
  const { value, className = '', ...otherProps } = props;
  const [preview, setPreview] = useState<Preview>();
  const [revision, setRevision] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const languageLoaderRef = useRef(createLatestAsyncLoader());
  const darkMode = useDarkThemeMode();
  const location = useMemo(() => {
    try {
      return validateCodeLocation(value);
    } catch {
      return undefined;
    }
  }, [value]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      validateCodeLocation(value);
      if (!window.services?.readPreview)
        throw new Error('请在 uTools 中预览本地文件');
      return window.services.readPreview(value);
    };
    load().then((result) => {
      if (active)
        setPreview({ value, revision, ...result });
    }).catch((error: unknown) => {
      if (active)
        setPreview({ value, revision, content: '', truncated: false, error: error instanceof Error ? error.message : '文件读取失败' });
    });
    return () => {
      active = false;
    };
  }, [value, revision]);

  const currentPreview = preview?.value === value && preview.revision === revision ? preview : undefined;
  const content = currentPreview?.content ?? '';
  const languagePath = location?.path ?? '';
  const languageName = codeMirrorLanguageName(languagePath);
  const totalLines = useMemo(() => content.split('\n').length, [content]);

  useEffect(() => {
    const parent = editorRef.current;
    if (!parent || !currentPreview || currentPreview.error || !content)
      return;
    const languageLoader = languageLoaderRef.current;
    const language = new Compartment();
    const initialState = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        EditorView.contentAttributes.of({ 'aria-label': '文件代码预览' }),
        language.of([]),
        ...(darkMode ? [oneDark] : [syntaxHighlighting(defaultHighlightStyle, { fallback: true })]),
        previewTheme(darkMode),
      ],
    });
    const view = new EditorView({
      state: initialState.update({ effects: StateEffect.appendConfig.of(bookmarkLineExtensions(initialState, location?.line)) }).state,
      parent,
    });
    if (location?.line && location.line <= view.state.doc.lines) {
      const position = view.state.doc.line(location.line).from;
      view.dispatch({ effects: EditorView.scrollIntoView(position, { y: 'center' }) });
    }
    languageLoader.run(
      () => loadCodeMirrorLanguage(languagePath),
      extension => view.dispatch({ effects: language.reconfigure(extension) }),
    ).catch(() => {
      // Unsupported or failed language packages keep the immediate plaintext preview.
    });
    return () => {
      languageLoader.invalidate();
      view.destroy();
    };
  }, [content, currentPreview, darkMode, languagePath, location?.line]);

  return (
    <div className={cn(styles.root, className)} data-theme={darkMode ? 'dark' : 'light'} {...otherProps}>
      <div className={styles.header}>
        <span className={styles.path} title={value}>{value}</span>
        <span className={styles.language}>{languageName}</span>
        <Button size="small" type="text" icon={<ReloadOutlined />} aria-label="刷新文件预览" onClick={() => setRevision(value => value + 1)} />
      </div>
      {!currentPreview && (
        <div className={styles.status}>
          <Spin size="small" />
          {' '}
          正在读取文件…
        </div>
      )}
      {currentPreview?.error && <div className={styles.status} role="status">{currentPreview.error}</div>}
      {currentPreview && !currentPreview.error && (
        <>
          {currentPreview.truncated && <div className={styles.notice}>仅预览前 256 KB / 3000 行，完整内容请用编辑器打开。</div>}
          {location?.line && location.line > totalLines && (
            <div className={styles.notice}>
              第
              {location.line}
              {' '}
              行超出当前预览范围。
            </div>
          )}
          {content === ''
            ? <div className={styles.status}>文件内容为空</div>
            : <div className={styles.editor} ref={editorRef} />}
        </>
      )}
    </div>
  );
}

export default CodePreview;
