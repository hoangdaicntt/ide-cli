import folderIcon from '../assests/icons/folder/folder.svg';
import htmlIcon from '../assests/icons/html/html.svg';
import javaScriptIcon from '../assests/icons/javaScript/javaScript.svg';
import jsonIcon from '../assests/icons/json/json.svg';
import reactIcon from '../assests/icons/react/react.svg';
import arrowExpandIcon from '../assests/icons/arrowExpand/arrowExpand.svg';
import closeIcon from '../assests/icons/close/close.svg';
import terminalIcon from '../assests/icons/terminal/terminal.svg';
import typeScriptIcon from '../assests/icons/typeScript/typeScript.svg';

type TreeAssetIconProps = {
  fileName?: string;
  isFolder?: boolean;
  className?: string;
};

function resolveFileIcon(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';

  switch (extension) {
    case 'ts':
      return typeScriptIcon;
    case 'tsx':
    case 'jsx':
      return reactIcon;
    case 'js':
      return javaScriptIcon;
    case 'json':
      return jsonIcon;
    case 'html':
      return htmlIcon;
    default:
      return htmlIcon;
  }
}

export function TreeAssetIcon({
  fileName,
  isFolder = false,
  className = 'h-4 w-4 shrink-0',
}: TreeAssetIconProps) {
  const src = isFolder ? folderIcon : resolveFileIcon(fileName ?? '');

  return <img src={src} alt="" className={className} draggable={false} />;
}

export function ArrowExpandIcon({
  className = 'h-3 w-3 shrink-0',
  expanded = false,
}: {
  className?: string;
  expanded?: boolean;
}) {
  return (
    <img
      src={arrowExpandIcon}
      alt=""
      className={[className, expanded ? 'rotate-90' : 'rotate-0'].join(' ')}
      draggable={false}
    />
  );
}

export function CloseIcon({ className = 'h-3.5 w-3.5 shrink-0' }: { className?: string }) {
  return <img src={closeIcon} alt="" className={className} draggable={false} />;
}

export function TerminalAssetIcon({ className = 'h-4 w-4 shrink-0' }: { className?: string }) {
  return <img src={terminalIcon} alt="" className={className} draggable={false} />;
}
