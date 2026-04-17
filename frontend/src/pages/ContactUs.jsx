import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { PhoneIcon, EnvelopeIcon, PaperAirplaneIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

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
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2">
          <PhoneIcon className="w-8 h-8 text-brand-500" />
          <FormattedMessage id="contact.title" defaultMessage="Contact Us" />
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          <FormattedMessage id="contact.subtitle" defaultMessage="Have a question or need help? Reach out to us." />
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contact Form */}
        <Card>
          {sent ? (
            <div className="text-center py-12">
              <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-green-700 dark:text-green-400 font-semibold text-lg">
                <FormattedMessage id="contact.messageSent" defaultMessage="Message sent successfully! We'll get back to you soon." />
              </p>
              <Button variant="primary" className="mt-6" onClick={() => setSent(false)}>
                <FormattedMessage id="contact.send" defaultMessage="Send Message" />
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label={<FormattedMessage id="contact.name" defaultMessage="Your Name" />}
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder={intl.formatMessage({ id: 'contact.namePlaceholder', defaultMessage: 'Enter your full name' })}
              />
              <Input
                label={<FormattedMessage id="contact.email" defaultMessage="Your Email" />}
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder={intl.formatMessage({ id: 'contact.emailPlaceholder', defaultMessage: 'Enter your email address' })}
              />
              <Input
                label={<FormattedMessage id="contact.phone" defaultMessage="Your Phone Number" />}
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                placeholder={intl.formatMessage({ id: 'contact.phonePlaceholder', defaultMessage: 'Enter your phone number' })}
              />
              <Input
                label={<FormattedMessage id="contact.message" defaultMessage="Your Message" />}
                as="textarea"
                name="message"
                value={form.message}
                onChange={handleChange}
                required
                rows={4}
                placeholder={intl.formatMessage({ id: 'contact.messagePlaceholder', defaultMessage: 'Tell us how we can help you...' })}
                className="resize-none"
              />
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={sending}
                iconLeft={<PaperAirplaneIcon />}
              >
                <FormattedMessage id="contact.send" defaultMessage="Send Message" />
              </Button>
          </form>
          )}
        </Card>

        {/* Contact Info */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">
              <FormattedMessage id="contact.orReachUs" defaultMessage="Or reach us directly" />
            </h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full p-3">
                  <EnvelopeIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                    <FormattedMessage id="contact.emailUs" defaultMessage="Email Us" />
                  </h3>
                  <a href="mailto:support@roomipilot.com" className="text-brand-600 hover:underline font-medium">
                    support@roomipilot.com
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full p-3">
                  <PhoneIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                    <FormattedMessage id="contact.callUs" defaultMessage="Call Us" />
                  </h3>
                  <a href="tel:+917719427089" className="text-brand-600 hover:underline font-medium">
                    07719427089
                  </a>
                </div>
              </div>
            </div>
          </Card>

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
              <p>support@roomipilot.com</p>
              <p>07719427089</p>
            </div>
          </div>
        </div>
      </div>

      {/* Back button */}
      <div className="text-center">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <FormattedMessage id="common.back" defaultMessage="Back" />
        </Button>
      </div>
    </div>
  );
};

export default ContactUs;
