import OrganizePDFScreen from './OrganizePDFScreen';

const TOOL_TIPS = [
  {
    icon: <Trash2 size={20} />,
    title: 'Click to Delete',
    description: 'Visually select pages to remove.'
  },
  {
    icon: <List size={20} />,
    title: 'Range Deletion',
    description: 'Type page ranges (e.g., 1-5, 8) to delete.'
  },
  {
    icon: <Eye size={20} />,
    title: 'Live Preview',
    description: 'See exactly what remains.'
  },
  {
    icon: <Zap size={20} />,
    title: 'Instant Processing',
    description: 'Generates new PDF in milliseconds.'
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Secure',
    description: 'Your file remains strictly local.'
  },
];


export default function RemovePagesScreen() {
  return <OrganizePDFScreen mode="remove" />;
}
