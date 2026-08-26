import OrganizePDFScreen from './OrganizePDFScreen';

const TOOL_TIPS = [
  {
    icon: <Copy size={20} />,
    title: 'Instant Cloning',
    description: 'Duplicate single or multiple pages instantly.'
  },
  {
    icon: <Layers size={20} />,
    title: 'Batch Duplication',
    description: 'Select ranges for massive cloning.'
  },
  {
    icon: <Eye size={20} />,
    title: 'Visual Preview',
    description: 'See exactly what you are duplicating.'
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Secure Edits',
    description: 'All edits happen directly in your browser.'
  },
  {
    icon: <Undo size={20} />,
    title: 'Non-Destructive',
    description: 'Original files are never overwritten.'
  },
];


export default function DuplicatePagesScreen() {
  return <OrganizePDFScreen mode="duplicate" />;
}
