import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';

const ContactUs = () => {
  const navigate = useNavigate();
  const intl = useIntl();
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    // Simulate sending — replace with actual API call when backend endpoint is ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSending(false);
    setSent(true);
    setForm({ name: '', email: '', phone: '', message: '' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800">
          📞 <FormattedMessage id="contact.title" defaultMessage="Contact Us" />
        </h1>
        <p className="text-gray-600 mt-2">
          <FormattedMessage id="contact.subtitle" defaultMessage="Have a question or need help? Reach out to us." />
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contact Form */}
        <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100">
          {sent ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-green-700 font-semibold text-lg">
                <FormattedMessage id="contact.messageSent" defaultMessage="Message sent successfully! We'll get back to you soon." />
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-6 bg-brand-500 hover:bg-brand-600 text-white px-6 py-2 rounded-lg font-semibold transition"
              >
                <FormattedMessage id="contact.send" defaultMessage="Send Message" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  <FormattedMessage id="contact.name" defaultMessage="Your Name" />
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder={intl.formatMessage({ id: 'contact.namePlaceholder', defaultMessage: 'Enter your full name' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  <FormattedMessage id="contact.email" defaultMessage="Your Email" />
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder={intl.formatMessage({ id: 'contact.emailPlaceholder', defaultMessage: 'Enter your email address' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  <FormattedMessage id="contact.phone" defaultMessage="Your Phone Number" />
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  placeholder={intl.formatMessage({ id: 'contact.phonePlaceholder', defaultMessage: 'Enter your phone number' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  <FormattedMessage id="contact.message" defaultMessage="Your Message" />
                </label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  required
                  rows={4}
                  placeholder={intl.formatMessage({ id: 'contact.messagePlaceholder', defaultMessage: 'Tell us how we can help you...' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className={`w-full ${sending ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-500 hover:bg-brand-600'} text-white py-3 rounded-xl font-semibold transition shadow-lg shadow-brand-500/20`}
              >
                {sending
                  ? '⏳ ' + intl.formatMessage({ id: 'contact.sending', defaultMessage: 'Sending...' })
                  : '📨 ' + intl.formatMessage({ id: 'contact.send', defaultMessage: 'Send Message' })}
              </button>
            </form>
          )}
        </div>

        {/* Contact Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              <FormattedMessage id="contact.orReachUs" defaultMessage="Or reach us directly" />
            </h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 text-blue-600 rounded-full p-3 text-xl">📧</div>
                <div>
                  <h3 className="font-semibold text-gray-800">
                    <FormattedMessage id="contact.emailUs" defaultMessage="Email Us" />
                  </h3>
                  <a href="mailto:support@roomipilot.com" className="text-brand-600 hover:underline font-medium">
                    support@roomipilot.com
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-green-100 text-green-600 rounded-full p-3 text-xl">📱</div>
                <div>
                  <h3 className="font-semibold text-gray-800">
                    <FormattedMessage id="contact.callUs" defaultMessage="Call Us" />
                  </h3>
                  <a href="tel:+919876543210" className="text-brand-600 hover:underline font-medium">
                    +91 98765 43210
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Quick info card */}
          <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl shadow-md p-8 text-white">
            <h3 className="text-xl font-bold mb-3">RoomiPilot</h3>
            <p className="opacity-90 text-sm leading-relaxed">
              <FormattedMessage
                id="guest.tagline"
                defaultMessage="The easiest way to manage your PG & Hostel business"
              />
            </p>
            <div className="mt-6 space-y-2 text-sm opacity-90">
              <p>📧 support@roomipilot.com</p>
              <p>📱 +91 98765 43210</p>
            </div>
          </div>
        </div>
      </div>

      {/* Back button */}
      <div className="text-center">
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition"
        >
          <FormattedMessage id="common.back" defaultMessage="Back" />
        </button>
      </div>
    </div>
  );
};

export default ContactUs;
