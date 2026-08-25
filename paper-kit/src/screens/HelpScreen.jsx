import { Mail, HelpCircle, FileQuestion, MessageSquare, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function HelpScreen() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <HelpCircle size={32} color="var(--color-primary)" />
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold' }}>Help & Support</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <section style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-divider)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Compass size={20} color="var(--color-primary)" /> PaperKit Feature Walkthrough
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Want to explore all key features, client-side security benefits, and AI tools in PaperKit?
          </p>
          <button className="btn-primary" onClick={() => navigate('/onboarding')}>
            <Compass size={18} /> View 13-Page Feature Tour
          </button>
        </section>

        <section style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-divider)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <FileQuestion size={20} /> Frequently Asked Questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <h3 style={{ fontWeight: 'bold', marginBottom: 'var(--space-1)' }}>Where are my converted files saved?</h3>
              <p style={{ color: 'var(--color-text-muted)' }}>Files are saved both locally on your device and in our secure cloud storage (if synced). Check the Storage Dashboard or My Files.</p>
            </div>
            <div>
              <h3 style={{ fontWeight: 'bold', marginBottom: 'var(--space-1)' }}>Is there a file size limit?</h3>
              <p style={{ color: 'var(--color-text-muted)' }}>The local processing limit can be configured in the Storage Dashboard. You can increase it if your device is powerful enough.</p>
            </div>
            <div>
              <h3 style={{ fontWeight: 'bold', marginBottom: 'var(--space-1)' }}>Are my files private?</h3>
              <p style={{ color: 'var(--color-text-muted)' }}>Yes! PaperKit is designed for privacy. Most operations run directly on your device, meaning your files never leave your phone.</p>
            </div>
          </div>
        </section>

        <section style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-divider)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <MessageSquare size={20} /> Contact Us
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Still need help? Reach out to our support team and we'll get back to you as soon as possible.
          </p>
          <button className="btn-primary" onClick={() => window.location.href = 'mailto:hello.theoriongd@gmail.com'}>
            <Mail size={18} /> Email Support
          </button>
        </section>
      </div>
    </div>
  );
}
