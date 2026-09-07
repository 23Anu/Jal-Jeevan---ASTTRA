import React from 'react';
import { Phone, ExternalLink, ShieldCheck, Mail, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer style={{
      background: '#0F172A',
      color: '#94A3B8',
      borderTop: '1px solid #1E293B',
      marginTop: 'auto',
      fontSize: '0.82rem'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '36px 20px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '28px'
      }}>
        {/* Col 1 */}
        <div>
          <h4 style={{ color: '#F8FAFC', fontSize: '0.95rem', fontWeight: 800, marginBottom: 12 }}>
            Drinking Water & Sanitation Department
          </h4>
          <p style={{ color: '#94A3B8', lineHeight: 1.6 }}>
            Government of Jharkhand, Nepal House, Doranda, Ranchi - 834002
          </p>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ color: '#E2E8F0' }}>📞 Helpline: <strong>1800-345-6555</strong></div>
            <div style={{ color: '#E2E8F0' }}>✉️ Email: dwsd-jharkhand@nic.in</div>
          </div>
        </div>

        {/* Col 2 */}
        <div>
          <h4 style={{ color: '#F8FAFC', fontSize: '0.95rem', fontWeight: 800, marginBottom: 12 }}>
            Smart India Hackathon (SIH26040)
          </h4>
          <p style={{ color: '#94A3B8', lineHeight: 1.6 }}>
            Smart Water Purification System with Dual-Tier IoT Telemetry & Real-Time BIS 10500 Compliance Monitoring.
          </p>
        </div>

        {/* Col 3 */}
        <div>
          <h4 style={{ color: '#F8FAFC', fontSize: '0.95rem', fontWeight: 800, marginBottom: 12 }}>
            Quick Links
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <a href="https://jaljeevanmission.gov.in" target="_blank" rel="noreferrer" style={{ color: '#94A3B8', textDecoration: 'none' }}>
              • Jal Jeevan Mission (JJM)
            </a>
            <a href="https://jharkhand.gov.in" target="_blank" rel="noreferrer" style={{ color: '#94A3B8', textDecoration: 'none' }}>
              • Govt. of Jharkhand Portal
            </a>
            <a href="https://bis.gov.in" target="_blank" rel="noreferrer" style={{ color: '#94A3B8', textDecoration: 'none' }}>
              • BIS 10500 Drinking Water Standards
            </a>
          </div>
        </div>
      </div>

      <div style={{
        borderTop: '1px solid #1E293B',
        padding: '16px 20px',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
        fontSize: '0.75rem'
      }}>
        <div>© 2026 Drinking Water & Sanitation Dept, Govt. of Jharkhand. All rights reserved.</div>
        <div style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
          <ShieldCheck size={14} /> Certified BIS 10500 Compliant
        </div>
      </div>
    </footer>
  );
}
