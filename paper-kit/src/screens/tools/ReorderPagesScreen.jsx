import OrganizePDFScreen from './OrganizePDFScreen';

const TOOL_TIPS = [
  {
    icon: <Move size={20} />,
    title: 'Drag & Drop',
    description: 'Intuitively reorder pages.'
  },
  {
    icon: <ArrowDownUp size={20} />,
    title: 'Reverse Order',
    description: 'Flip the entire document instantly.'
  },
  {
    icon: <LayoutGrid size={20} />,
    title: 'Visual Grid',
    description: 'Zoom out to see the big picture.'
  },
  {
    icon: <Zap size={20} />,
    title: 'Lightning Fast',
    description: 'No waiting for cloud uploads.'
  },
  {
    icon: <ShieldCheck size={20} />,
    title: '100% Private',
    description: 'Reordered securely on your device.'
  },
];


export default function ReorderPagesScreen() {
  return <OrganizePDFScreen mode="reorder" />;
}
