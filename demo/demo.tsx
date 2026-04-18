import React, { useState } from 'react';
import {
    ChevronRight,
    ChevronDown,
    Folder,
    FileCode,
    FileJson,
    MessageSquare,
    TerminalSquare,
    Search,
    GitBranch,
    Settings,
    Cpu,
    X,
    Plus,
    MoreHorizontal,
    Zap,
    Sparkles,
    ArrowUp,
    Image as ImageIcon,
    AlertCircle
} from 'lucide-react';

const App = () => {
    return (
        <div className="flex flex-col h-screen w-screen bg-white text-[#333333] font-sans overflow-hidden">

            {/* Main Content: 5 Columns Layout (4 main + 1 small activity bar on the right) */}
            <div
                className="flex-1 grid overflow-hidden"
                style={{ gridTemplateColumns: '250px 1fr 1fr 250px 40px' }}
            >
                {/* COL 1: Workspace & Tasks (250px) */}
                <div className="flex h-full border-r border-[#e5e5e5] bg-[#f3f3f3]">
                    {/* Workspace Tree */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-4 py-2 text-[11px] uppercase tracking-wider font-semibold text-[#666666] flex justify-between items-center">
                            <span>Workspace</span>
                            <Plus size={14} className="cursor-pointer hover:text-black" />
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <TreeFolder title="Project Alpha" defaultOpen isWorkspace>
                                <TaskThread title="Fix Login Bug" active />
                                <TaskThread title="Setup Database" />
                                <TaskThread title="Refactor Auth API" />
                            </TreeFolder>
                            <TreeFolder title="Frontend React" isWorkspace>
                                <TaskThread title="Update UI Layout" />
                                <TaskThread title="Optimize Images" />
                            </TreeFolder>
                            <TreeFolder title="DevOps" isWorkspace>
                                <TaskThread title="Configure CI/CD" />
                            </TreeFolder>
                        </div>
                    </div>
                </div>

                {/* COL 2: Codex Panel (50% remaining) */}
                <div className="h-full flex flex-col border-r border-[#e5e5e5] bg-white">
                    {/* Header */}
                    <div className="h-9 flex items-center px-4 bg-[#f3f3f3] border-b border-[#e5e5e5] gap-2">
                        <Cpu size={16} className="text-[#007acc]" />
                        <span className="text-[13px] font-medium">Codex AI</span>
                        <div className="flex-1"></div>
                        <MoreHorizontal size={16} className="text-[#666666] cursor-pointer hover:text-black" />
                        <X size={16} className="text-[#666666] cursor-pointer hover:text-black ml-2" />
                    </div>

                    {/* Chat History */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-[13px]">
                        <div className="flex gap-3">
                            <div className="w-6 h-6 rounded bg-[#007acc] flex items-center justify-center text-white font-bold flex-shrink-0">
                                U
                            </div>
                            <div className="pt-1">
                                <p>Hãy giúp tôi refactor lại hàm tính toán phía bên phải.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-6 h-6 rounded bg-[#e5e5e5] flex items-center justify-center text-[#333333] flex-shrink-0">
                                <Zap size={14} className="text-[#007acc]" />
                            </div>
                            <div className="pt-1 w-full">
                                <p className="mb-2 text-[#333333]">Được thôi, tôi thấy bạn đang viết hàm tính tổng. Dưới đây là cách refactor ngắn gọn hơn sử dụng `reduce`:</p>
                                <div className="bg-[#f9f9f9] border border-[#e5e5e5] rounded-md overflow-hidden">
                                    <div className="bg-[#eeeeee] px-2 py-1 text-xs text-[#666666] flex justify-between border-b border-[#e5e5e5]">
                                        <span>javascript</span>
                                        <span className="cursor-pointer hover:text-black">Copy</span>
                                    </div>
                                    <pre className="p-3 text-[12px] font-mono overflow-x-auto text-[#333333]">
                    <span className="text-[#0000ff]">const</span> <span className="text-[#795e26]">calculateTotal</span> <span className="text-[#0000ff]">=</span> (items) <span className="text-[#0000ff]">=&gt;</span> {'{\n'}
                                        {'  '}<span className="text-[#0000ff]">return</span> items.<span className="text-[#795e26]">reduce</span>((sum, item) <span className="text-[#0000ff]">=&gt;</span> sum <span className="text-[#0000ff]">+=</span> item.price, <span className="text-[#098658]">0</span>);
                                        {'\n}'}
                  </pre>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Input Area (Composer) */}
                    <div className="p-4 bg-white border-t border-[#e5e5e5] relative flex-shrink-0 flex flex-col gap-2">

                        {/* Context Files Panel (Separated from composer) */}
                        <div className="bg-white border border-[#e5e5e5] rounded-xl shadow-sm text-[13px] py-2 max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                            <div className="flex items-center px-3 py-1.5 hover:bg-[#f5f5f5] cursor-pointer">
                                <span className="mr-2 text-[14px]">🐘</span>
                                <span className="font-medium text-[#666666]">category.php</span>
                                <span className="ml-2 text-[#858585] truncate">9tracking-theme</span>
                            </div>
                            <div className="flex items-center px-3 py-1.5 hover:bg-[#f5f5f5] cursor-pointer">
                                <span className="mr-2 text-[14px]">🐘</span>
                                <span className="font-medium text-[#666666]">class-nine-tracking-deepai-image-provider.php</span>
                                <span className="ml-2 text-[#858585] truncate">9tracking-plugin/includes</span>
                            </div>
                            <div className="flex items-center px-3 py-1.5 hover:bg-[#f5f5f5] cursor-pointer">
                                <span className="mr-2 text-[14px]">🐘</span>
                                <span className="font-medium text-[#666666]">class-nine-tracking-image-provider-registry.php</span>
                                <span className="ml-2 text-[#858585] truncate">9tracking-plugin/includes</span>
                            </div>
                            <div className="flex items-center px-3 py-1.5 hover:bg-[#f5f5f5] cursor-pointer">
                                <span className="mr-2 text-[14px]">🐘</span>
                                <span className="font-medium text-[#666666]">class-nine-tracking-settings.php</span>
                                <span className="ml-2 text-[#858585] truncate">9tracking-plugin/includes</span>
                            </div>
                            <div className="flex items-center px-3 py-1.5 hover:bg-[#f5f5f5] cursor-pointer">
                                <ImageIcon size={14} className="mr-2 text-[#858585]" />
                                <span className="font-medium text-[#666666]">how-to-track-international-packages.jpg</span>
                                <span className="ml-2 text-[#858585] truncate">9tracking-theme/assets/images</span>
                            </div>
                            <div className="flex items-center px-3 py-1.5 bg-[#e8e8e8] cursor-pointer">
                                <ImageIcon size={14} className="mr-2 text-[#858585]" />
                                <span className="font-medium text-[#333333]">logo.svg</span>
                                <span className="ml-2 text-[#858585] truncate">9tracking-theme/assets/images</span>
                            </div>
                        </div>

                        {/* Composer Input Box */}
                        <div className="bg-white rounded-2xl border border-[#cccccc] shadow-sm flex flex-col transition-shadow focus-within:shadow-md focus-within:border-[#b3b3b3]">
                            <div className="p-3 pb-8">
                                <input
                                    type="text"
                                    value="Nhập nội dung file @categ"
                                    onChange={() => {}}
                                    className="w-full bg-transparent border-none outline-none text-[15px] text-[#333333] font-medium"
                                />
                            </div>

                            {/* Toolbar */}
                            <div className="flex items-center justify-between px-3 pb-3">
                                <div className="flex items-center gap-3 text-[13px] text-[#666666]">
                                    <Plus size={18} className="cursor-pointer hover:text-black" />
                                    <div className="flex items-center gap-1 cursor-pointer text-[#b48600] font-medium">
                                        <AlertCircle size={15} />
                                        <span>Full access</span>
                                        <ChevronDown size={14} className="text-[#666666]" />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-[13px] text-[#666666] font-medium">
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-black">
                                        <Zap size={14} />
                                        <span>GPT-5.4</span>
                                        <ChevronDown size={14} />
                                    </div>
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-black">
                                        <span>Medium</span>
                                        <ChevronDown size={14} />
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-white cursor-pointer hover:bg-black ml-1">
                                        <ArrowUp size={16} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* COL 3: Editor & Terminal (50% remaining) */}
                <div className="h-full flex flex-col border-r border-[#e5e5e5] min-w-0">

                    {/* Editor Area (Top 60%) */}
                    <div className="h-[60%] flex flex-col min-h-0 border-b border-[#e5e5e5]">
                        {/* Editor Tabs */}
                        <div className="flex bg-[#f3f3f3] overflow-x-auto no-scrollbar border-b border-[#e5e5e5] flex-shrink-0">
                            <div className="flex items-center gap-2 bg-white px-3 py-2 border-t-2 border-[#007acc] min-w-fit cursor-pointer text-[13px]">
                                <FileCode size={14} className="text-[#bda142]" />
                                <span className="text-black">utils.js</span>
                                <X size={14} className="text-[#666666] hover:text-black ml-2 rounded hover:bg-[#e8e8e8]" />
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 border-t-2 border-transparent border-r border-[#e5e5e5] min-w-fit cursor-pointer text-[13px] text-[#666666] hover:bg-[#e8e8e8]">
                                <FileJson size={14} className="text-[#42a5f5]" />
                                <span>package.json</span>
                            </div>
                        </div>

                        {/* Editor Content */}
                        <div className="flex-1 bg-white flex overflow-hidden">
                            {/* Line Numbers */}
                            <div className="w-12 py-4 flex flex-col items-end pr-4 text-[#237893] font-mono text-[13px] select-none flex-shrink-0">
                                <span>1</span>
                            </div>
                            {/* Code */}
                            <div className="flex-1 py-4 font-mono text-[14px] leading-relaxed overflow-y-auto outline-none text-[#333333]" spellCheck="false" contentEditable suppressContentEditableWarning>
                                <div><span className="text-[#0000ff]">export</span> <span className="text-[#0000ff]">const</span> <span className="text-[#795e26]">calculateTotal</span> = (<span className="text-[#001080]">items</span>) <span className="text-[#0000ff]">=&gt;</span> items.<span className="text-[#795e26]">reduce</span>((a, b) <span className="text-[#0000ff]">=&gt;</span> a + b.price, <span className="text-[#098658]">0</span>);</div>
                            </div>
                        </div>
                    </div>

                    {/* Terminal Area (Bottom 40%) */}
                    <div className="h-[40%] flex flex-col min-h-0 bg-white">
                        {/* Terminal Tabs */}
                        <div className="flex items-center justify-between h-9 text-[12px] text-[#666666] bg-[#f3f3f3] border-b border-[#e5e5e5] flex-shrink-0">
                            <div className="flex h-full">
                                <div className="flex items-center gap-2 px-3 h-full border-r border-[#e5e5e5] bg-white cursor-pointer text-black border-t-2 border-t-[#007acc]">
                                    <TerminalSquare size={14} className="text-[#007acc]" />
                                    <span>npm run dev</span>
                                    <X size={14} className="text-[#666666] hover:text-black ml-1 rounded hover:bg-[#e8e8e8]" />
                                </div>
                                <div className="flex items-center gap-2 px-3 h-full border-r border-[#e5e5e5] cursor-pointer hover:bg-[#e8e8e8]">
                                    <TerminalSquare size={14} className="text-[#666666]" />
                                    <span>bash</span>
                                </div>
                            </div>
                            <div className="flex gap-2 px-4">
                                <Plus size={14} className="cursor-pointer hover:text-black" />
                                <X size={14} className="cursor-pointer hover:text-black" />
                            </div>
                        </div>
                        {/* Terminal Content */}
                        <div className="flex-1 p-3 font-mono text-[13px] overflow-y-auto">
                            <div className="mt-2 flex items-center gap-2">
                                <span className="text-[#008000]">dev@macbook<span className="text-[#333333]">:</span><span className="text-[#0451a5]">~/projects/ai-studio</span><span className="text-[#333333]">$</span></span>
                                <span className="w-2 h-4 bg-[#666666] animate-pulse"></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* COL 4: File Explorer (250px) */}
                <div className="h-full bg-[#f3f3f3] flex flex-col">
                    <div className="px-4 py-2 text-[11px] uppercase tracking-wider font-semibold text-[#666666] flex justify-between items-center h-9">
                        <span>Tập tin (Explorer)</span>
                        <MoreHorizontal size={14} className="cursor-pointer hover:text-black" />
                    </div>
                    <div className="flex-1 overflow-y-auto pb-4 text-[13px]">
                        <TreeFolder title="ai-studio" defaultOpen isRoot>
                            <TreeFolder title=".vscode" />
                            <TreeFolder title="node_modules" />
                            <TreeFolder title="public" />
                            <TreeFolder title="src" defaultOpen>
                                <TreeFolder title="components" />
                                <TreeFolder title="utils" defaultOpen>
                                    <FileItem name="helpers.js" />
                                    <FileItem name="utils.js" active />
                                </TreeFolder>
                                <FileItem name="App.jsx" />
                                <FileItem name="main.jsx" />
                                <FileItem name="index.css" />
                            </TreeFolder>
                            <FileItem name=".eslintrc.cjs" />
                            <FileItem name="index.html" />
                            <FileItem name="package.json" />
                            <FileItem name="vite.config.js" />
                        </TreeFolder>
                    </div>
                </div>

                {/* COL 5: Activity Bar (Moved to the Right - 40px) */}
                <div className="w-10 h-full flex flex-col items-center py-2 border-l border-[#e5e5e5] bg-[#e8e8e8] justify-between">
                    <div className="flex flex-col items-center gap-4 w-full">
                        <div className="p-2 text-[#666666] hover:text-black cursor-pointer relative">
                            <FileCode size={20} />
                        </div>
                        <div className="p-2 text-[#666666] hover:text-black cursor-pointer">
                            <Search size={20} />
                        </div>
                        <div className="p-2 text-[#666666] hover:text-black cursor-pointer">
                            <GitBranch size={20} />
                        </div>
                        {/* Active Icon Indicator on the Right side of the App */}
                        <div className="p-2 text-black border-l-2 border-[#007acc] cursor-pointer bg-[#e4e6f1]">
                            <MessageSquare size={20} />
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-4 w-full pb-2">
                        <div className="p-2 text-[#666666] hover:text-black cursor-pointer">
                            <Settings size={20} />
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
};

/* Helper Components */
const TreeFolder = ({ title, children, defaultOpen = false, isRoot = false, isWorkspace = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="select-none">
            <div
                className={`flex items-center py-1 px-2 cursor-pointer hover:bg-[#e8e8e8] ${isRoot ? 'font-bold' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
        <span className="w-4 flex justify-center text-[#666666]">
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
                {!isRoot && <Folder size={14} className="mr-1 text-[#cca76a]" />}
                <span className="truncate">{title}</span>
            </div>
            {isOpen && (
                <div className="pl-4">
                    {children}
                    {/* Nút New Task cho mỗi Workspace */}
                    {isWorkspace && (
                        <div className="flex items-center py-1 px-2 pl-4 cursor-pointer text-[13px] text-[#007acc] hover:bg-[#e8e8e8]">
                            <Plus size={14} className="mr-2" />
                            <span>New task</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const TaskThread = ({ title, active = false }) => {
    return (
        <div className={`flex items-center py-1 px-2 pl-4 cursor-pointer text-[13px] hover:bg-[#e8e8e8] ${active ? 'bg-[#e4e6f1] text-black' : 'text-[#333333]'}`}>
            <MessageSquare size={14} className={`mr-2 ${active ? 'text-[#007acc]' : 'text-[#666666]'}`} />
            <span className="truncate">{title}</span>
        </div>
    );
};

const FileItem = ({ name, active = false }) => {
    const getIcon = () => {
        if (name.endsWith('.js') || name.endsWith('.jsx')) return <FileCode size={14} className="mr-2 text-[#bda142]" />;
        if (name.endsWith('.json')) return <FileJson size={14} className="mr-2 text-[#42a5f5]" />;
        if (name.endsWith('.css')) return <FileCode size={14} className="mr-2 text-[#4caf50]" />;
        return <FileCode size={14} className="mr-2 text-[#666666]" />;
    };

    return (
        <div className={`flex items-center py-1 px-2 cursor-pointer hover:bg-[#e8e8e8] ${active ? 'bg-[#e4e6f1] text-black' : 'text-[#333333]'}`}>
            <span className="w-4"></span>
            {getIcon()}
            <span className="truncate">{name}</span>
        </div>
    );
};

export default App;
