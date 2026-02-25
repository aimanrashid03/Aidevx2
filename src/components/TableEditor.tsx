import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface TableEditorProps {
    columns: string[];
    initialData: string[][];
    onChange: (data: string[][]) => void;
}

export default function TableEditor({ columns, initialData, onChange }: TableEditorProps) {
    const [data, setData] = useState<string[][]>(initialData || []);

    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        const newData = [...data];
        newData[rowIndex] = [...newData[rowIndex]];
        newData[rowIndex][colIndex] = value;
        setData(newData);
        onChange(newData);
    };

    const addRow = () => {
        const emptyRow = new Array(columns.length).fill('');
        const newData = [...data, emptyRow];
        setData(newData);
        onChange(newData);
    };

    const removeRow = (rowIndex: number) => {
        const newData = data.filter((_, idx) => idx !== rowIndex);
        setData(newData);
        onChange(newData);
    };

    // Fallback if no columns are parsed
    const cols = columns.length > 0 ? columns : ['Column 1', 'Column 2'];

    return (
        <div className="w-full bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500">
                        <tr>
                            <th className="w-10 px-3 py-3 text-center"></th>
                            {cols.map((col, idx) => (
                                <th key={idx} className="px-4 py-3">{col}</th>
                            ))}
                            <th className="w-12 px-3 py-3 text-center"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-3 py-2 text-center text-slate-300">
                                    <GripVertical size={16} className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
                                </td>
                                {cols.map((_, colIndex) => (
                                    <td key={colIndex} className="px-4 py-2">
                                        <textarea
                                            value={row[colIndex] || ''}
                                            onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                            placeholder="..."
                                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm resize-none overflow-hidden min-h-[24px]"
                                            rows={1}
                                            onInput={(e) => {
                                                const target = e.target as HTMLTextAreaElement;
                                                target.style.height = 'auto';
                                                target.style.height = `${target.scrollHeight}px`;
                                            }}
                                        />
                                    </td>
                                ))}
                                <td className="px-3 py-2 text-center">
                                    <button
                                        onClick={() => removeRow(rowIndex)}
                                        className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Remove Row"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={cols.length + 2} className="px-4 py-8 text-center text-slate-400 text-sm">
                                    No rows added yet. Click below to add one.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200">
                <button
                    onClick={addRow}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors px-2 py-1 rounded hover:bg-slate-200/50"
                >
                    <Plus size={14} />
                    Add Row
                </button>
            </div>
        </div>
    );
}
