import { Shield, Zap, Sparkles } from 'lucide-react';

export default function AboutScreen() {
  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <img src="/icons/icon-192x192.png" alt="PaperKit Logo" style={{ width: '120px', height: '120px', margin: '0 auto var(--space-4)', borderRadius: '20%' }} />
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', marginBottom: 'var(--space-2)' }}>PaperKit</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-6)' }}>All-in-One PDF Solution</p>
      
      <p style={{ color: 'var(--color-text-primary)', marginBottom: 'var(--space-8)', lineHeight: '1.6' }}>
        PaperKit is a powerful, privacy-first document and media processing platform. 
        It leverages cutting-edge WebAssembly (Wasm) and local processing to bring desktop-class tools 
        directly to your browser and mobile device.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', textAlign: 'left' }}>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-divider)' }}>
          <Shield size={24} color="var(--color-success)" style={{ marginBottom: 'var(--space-2)' }} />
          <h3 style={{ fontWeight: 'bold', marginBottom: 'var(--space-1)' }}>Privacy First</h3>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Files are processed entirely on your device whenever possible.</p>
        </div>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-divider)' }}>
          <Zap size={24} color="#F59E0B" style={{ marginBottom: 'var(--space-2)' }} />
          <h3 style={{ fontWeight: 'bold', marginBottom: 'var(--space-1)' }}>Lightning Fast</h3>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>No upload or download delays for local operations.</p>
        </div>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-divider)' }}>
          <Sparkles size={24} color="var(--color-primary)" style={{ marginBottom: 'var(--space-2)' }} />
          <h3 style={{ fontWeight: 'bold', marginBottom: 'var(--space-1)' }}>All Features Free</h3>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>We believe powerful tools should be accessible to everyone.</p>
        </div>
      </div>
      
      <div style={{ marginTop: 'var(--space-8)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
        <p>Version 2.0.0</p>
        <p>&copy; {new Date().getFullYear()} Godfrey T R (hello.theoriongd@gmail.com). All rights reserved.</p>
      </div>
    </div>
  );
}
