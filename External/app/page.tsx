'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase, ArrowRight, ShieldCheck, CheckCircle2,
  Calendar, DollarSign, Users, X, Menu, HelpCircle,
  Building2, Globe, Send, User, Mail, Phone, Link2,
  Sun, Moon
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function HomePage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('wh-theme');
    setIsDark(saved ? saved === 'dark' : true);
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('wh-theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // Application Modal state
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [applying, setApplying] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  const toggleJobExpand = (id: string) => {
    setExpandedJobs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    resumeUrl: '',
    linkedinUrl: '',
    source: 'Career Page',
    notes: '',
    dob: '',
    gender: '',
    maritalStatus: '',
    fatherName: '',
    motherName: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: ''
  });

  // Fetch published job openings
  useEffect(() => {
    async function fetchJobs() {
      setLoadingJobs(true);
      try {
        const res = await fetch('/api/populate/read/job_openings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filter: { status: 'Published' },
            limit: 20
          })
        });
        if (res.ok) {
          const body = await res.json();
          setJobs(body.data || []);
        }
      } catch (err) {
        console.error('Error fetching jobs:', err);
      } finally {
        setLoadingJobs(false);
      }
    }
    fetchJobs();
  }, []);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.phone) {
      toast.error('Please fill required fields.');
      return;
    }
    setApplying(true);
    try {
      const res = await fetch('/api/populate/create/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          resumeUrl: form.resumeUrl,
          linkedinUrl: form.linkedinUrl,
          source: form.source,
          notes: form.notes,
          dob: form.dob || undefined,
          gender: form.gender || undefined,
          maritalStatus: form.maritalStatus || undefined,
          fatherName: form.fatherName || undefined,
          motherName: form.motherName || undefined,
          address: {
            street: form.street || undefined,
            city: form.city || undefined,
            state: form.state || undefined,
            zip: form.zip || undefined,
            country: form.country || undefined
          },
          jobOpeningId: selectedJob._id,
          stage: 'Applied'
        })
      });
      if (res.ok) {
        toast.success('Application submitted successfully!');
        setSelectedJob(null);
        setForm({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          resumeUrl: '',
          linkedinUrl: '',
          source: 'Career Page',
          notes: '',
          dob: '',
          gender: '',
          maritalStatus: '',
          fatherName: '',
          motherName: '',
          street: '',
          city: '',
          state: '',
          zip: '',
          country: ''
        });
      } else {
        toast.error('Failed to submit application. Please try again.');
      }
    } catch (err) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-violet-500 selection:text-white transition-colors duration-300 ${isDark ? 'dark bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Toaster position="top-right" />

      {/* ─── NAVIGATION HEADER ─── */}
      <header className={`sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors duration-300 ${isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-white/80'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center font-bold text-white shadow-lg shadow-violet-500/20">
              W
            </div>
            <span className={`text-[17px] font-bold tracking-tight ${isDark ? 'bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent' : 'text-slate-900'}`}>
              Work Hub
            </span>
          </div >

          {/* Desktop Nav */}
          < nav className={`hidden md:flex items-center gap-8 text-[13px] font-medium transition-colors ${isDark ? 'text-slate-400' : 'text-slate-600'}`} >
            <a href="#products" className={`transition ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>Products</a>
            <a href="#company" className={`transition ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>About Us</a>
            <a href="#careers" className={`transition ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>Careers</a>
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={`p-2 rounded-lg transition cursor-pointer ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => router.push('/login')}
              className={`px-4 py-2 rounded-lg font-semibold transition cursor-pointer ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-900 hover:bg-slate-700 text-white'}`}
            >
              Support Portal
            </button>
          </nav >

          {/* Mobile Menu trigger */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={`p-1.5 rounded-lg transition cursor-pointer ${isDark ? 'bg-slate-800 text-yellow-400' : 'bg-slate-100 text-slate-700'}`}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            < button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)
              }
              className={`p-1 transition ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Menu className="h-6 w-6" />
            </button >
          </div >

          {/* Mobile Nav Overlay */}
          {
            mobileMenuOpen && (
              <div className={`md:hidden border-t px-6 py-4 space-y-4 animate-fade-in ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'}`}>
                <a href="#products" onClick={() => setMobileMenuOpen(false)} className={`block text-[14px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Products</a>
                <a href="#company" onClick={() => setMobileMenuOpen(false)} className={`block text-[14px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>About Us</a>
                <a href="#careers" onClick={() => setMobileMenuOpen(false)} className={`block text-[14px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Careers</a>
                <button
                  onClick={() => { setMobileMenuOpen(false); router.push('/login'); }}
                  className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold"
                >
                  Support Portal
                </button>
              </div>
            )
          }
        </div>
      </header >

      {/* ─── HERO SECTION ─── */}
      < section className="relative overflow-hidden pt-24 pb-20 lg:pt-32 lg:pb-28" >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 text-center space-y-6">
          <span className="px-3 py-1 text-[11px] font-bold tracking-wider uppercase rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
            Work Hub Suite
          </span >
          <h1 className={`text-4xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Simplify Operations.<br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-500 bg-clip-text text-transparent">
              Empower Your Global Workforce.
            </span>
          </h1>
          <p className={`text-base md:text-lg max-w-2xl mx-auto font-normal ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            The next-generation ERP designed to integrate Customer Relations, Time Tracking, Payroll computation, and internal Customer Support into a single glassmorphic dashboard.
          </p>
          <div className="pt-4 flex items-center justify-center gap-4">
            <a
              href="#careers"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-semibold text-[14px] shadow-lg shadow-violet-500/20 transition flex items-center gap-2 group cursor-pointer text-white"
            >
              Explore Careers <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
            </a>
            <button
              onClick={() => router.push('/login')}
              className={`px-6 py-3 rounded-xl font-semibold text-[14px] transition cursor-pointer ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
            >
              Client Login
            </button>
          </div>
        </div >
      </section >

      {/* ─── PRODUCTS SHOWCASE ─── */}
      < section id="products" className={`py-20 border-t transition-colors duration-300 ${isDark ? 'border-slate-800/60 bg-slate-900/50' : 'border-slate-200 bg-white'}`} >
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Integrate Your Entire Business</h2>
            <p className={`text-sm max-w-lg mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No more siloed apps. Work Hub unifies operations end-to-end.</p>
          </div >

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'CRM & Pipeline', desc: 'Manage client leads, meetings tracker, quotation conversions, and health status indicators dynamically.', icon: Users, color: 'from-blue-500 to-cyan-500' },
              { title: 'Attendance & Leaves', desc: 'Visual shifts planner, biometric integrations, dynamic check-ins with geofencing, and calendar summaries.', icon: Calendar, color: 'from-amber-500 to-orange-500' },
              { title: 'Payroll Run Engine', desc: 'Compliant tax calculation, provident funds, insurance, and dynamic payslip generators on lock.', icon: DollarSign, color: 'from-emerald-500 to-teal-500' },
              { title: 'Helpdesk Tickets', desc: 'Secure agent access, chronological activities, client comment reply logs, and automated assignments.', icon: HelpCircle, color: 'from-violet-500 to-purple-500' }
            ].map((p, i) => {
              const Icon = p.icon;
              return (
                <div key={i} className={`border rounded-2xl p-6 transition flex flex-col justify-between ${isDark ? 'bg-slate-950 border-slate-800/80 hover:border-slate-700/80' : 'bg-slate-50 border-slate-200 hover:border-slate-300 shadow-sm'}`}>
                  <div className="space-y-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${p.color} flex items-center justify-center text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className={`text-[16px] font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{p.title}</h3>
                    <p className={`text-[12px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div >
      </section >

      {/* ─── ABOUT COMPANY ─── */}
      < section id="company" className={`py-20 border-t transition-colors duration-300 ${isDark ? 'border-slate-800/60 bg-slate-950/20' : 'border-slate-200 bg-slate-50'}`} >
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-[11px] font-bold text-violet-400 tracking-wider uppercase">Our Mission</span>
            <h2 className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>We build robust platforms for scaling enterprises.</h2>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Work Hub is born out of a desire to build simple, highly configurable, and secure business management tools. Over 100 enterprise customers trust us to power their day-to-day operations, payroll runs, customer assistance desks, and field sales activities.
            </p >
            <div className="space-y-3.5">
              {[
                { title: 'Global Operations', icon: Globe },
                { title: 'Enterprise Security Grade (ABAC/CBAC)', icon: ShieldCheck },
                { title: 'Integrated Client Portals', icon: Building2 }
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-violet-400 ${isDark ? 'bg-slate-800' : 'bg-violet-50 border border-violet-100'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={`text-[13px] font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{item.title}</span>
                  </div>
                );
              })}
            </div>
          </div >
          <div className={`relative h-72 md:h-96 rounded-3xl bg-gradient-to-tr from-violet-600/30 to-fuchsia-600/30 border flex items-center justify-center overflow-hidden ${isDark ? 'border-slate-800' : 'border-violet-200'}`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),transparent_60%)]" />
            <div className="z-10 text-center space-y-2">
              <p className="text-5xl font-extrabold text-white">100+</p>
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Global Enterprise Clients</p>
            </div>
          </div>
        </div >
      </section >

      {/* ─── CAREERS PORTAL ─── */}
      < section id="careers" className={`py-20 border-t transition-colors duration-300 ${isDark ? 'border-slate-800/60 bg-slate-950/40' : 'border-slate-200 bg-white'}`} >
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Join the Work Hub Team</h2>
            <p className={`text-sm max-w-lg mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Shape the future of work. View our open positions below and apply in 2 minutes.</p>
          </div >

          {
            loadingJobs ? (
              <div className="flex justify-center py-12" >
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent" />
              </div>
            ) : jobs.length === 0 ? (
              <div className={`text-center py-16 border rounded-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <Briefcase className={`h-8 w-8 mx-auto mb-3 opacity-60 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No open positions at this time. Check back later!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {jobs.filter(j => (j.openings ?? 0) - (j.filled ?? 0) > 0).length === 0 ? (
                  <div className={`col-span-2 text-center py-16 border rounded-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <Briefcase className={`h-8 w-8 mx-auto mb-3 opacity-60 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No open positions at this time. Check back later!</p>
                  </div>
                ) : null}
                {jobs.map((job) => {
                  const remaining = (job.openings ?? 0) - (job.filled ?? 0);
                  if (remaining <= 0) return null;
                  return (
                    <div key={job._id} className={`border rounded-2xl p-6 transition flex flex-col justify-between ${isDark ? 'bg-slate-900 border-slate-800/80 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <h3 className={`text-[16px] font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{job.title}</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                            {job.jobType}
                          </span>
                        </div>
                        <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Location: {job.location || 'Remote'} | Openings Available: {remaining}
                        </p>
                        {job.description && (
                          <div className="pt-1">
                            <p className={`text-[12px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'} ${expandedJobs.has(job._id) ? '' : 'line-clamp-3'}`}>
                              {job.description}
                            </p>
                            <button
                              onClick={() => toggleJobExpand(job._id)}
                              className="mt-1 text-[11px] font-semibold text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
                            >
                              {expandedJobs.has(job._id) ? 'Show less ↑' : 'Read more ↓'}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className={`pt-4 border-t mt-4 flex items-center justify-end ${isDark ? 'border-slate-800/50' : 'border-slate-200'}`}>
                        <button
                          onClick={() => setSelectedJob(job)}
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 font-bold text-[12px] text-white transition cursor-pointer"
                        >
                          Apply Now
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div >
      </section >

      {/* ─── FOOTER ─── */}
      < footer className={`border-t py-10 text-center text-[12px] transition-colors duration-300 ${isDark ? 'border-slate-800/60 bg-slate-950 text-slate-500' : 'border-slate-200 bg-slate-100 text-slate-500'}`} >
        <div className="max-w-7xl mx-auto px-6 space-y-4">
          <p>© 2026 Work Hub Technologies Private Limited. All rights reserved.</p>
          <div className={`flex justify-center gap-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <a href="#products" className={`transition ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>Products</a>
            <a href="#company" className={`transition ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>About</a>
            <a href="#careers" className={`transition ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>Careers</a>
            <a href="/login" className={`transition ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>Client Portal</a>
          </div>
        </div >
      </footer >

      {/* ─── APPLICATION FORM MODAL ─── */}
      {
        selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setSelectedJob(null)}>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-left">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">Careers Application</span>
                  <h3 className="text-[15px] font-bold text-white mt-0.5">Apply for {selectedJob.title}</h3>
                </div>
                <button onClick={() => setSelectedJob(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-800 cursor-pointer">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleApply} className="flex-1 overflow-y-auto p-6 space-y-4 text-[12px]">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-400 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> First Name *</label>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={e => setForm(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="John"
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none focus:border-violet-500"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-400">Last Name</label>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={e => setForm(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Doe"
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john@example.com"
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none focus:border-violet-500"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-400 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone *</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 555-0199"
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none focus:border-violet-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-400 flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Resume Link (Drive/Dropbox/PDF) *</label>
                  <input
                    type="url"
                    value={form.resumeUrl}
                    onChange={e => setForm(prev => ({ ...prev, resumeUrl: e.target.value }))}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none focus:border-violet-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-400">LinkedIn Profile URL</label>
                  <input
                    type="url"
                    value={form.linkedinUrl}
                    onChange={e => setForm(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none focus:border-violet-500"
                  />
                </div>


                {/* Optional Personal Info Accordion */}
                <details className="group border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
                  <summary className="flex items-center justify-between p-3 font-semibold text-slate-300 hover:text-white cursor-pointer select-none text-[12px] bg-slate-950/80">
                    <span>Additional Personal Information (Optional)</span>
                    <span className="transition-transform group-open:rotate-180">▼</span>
                  </summary>

                  <div className="p-4 space-y-3.5 border-t border-slate-800 text-[12px] bg-slate-900/40">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-400">Date of Birth</label>
                        <input
                          type="date"
                          value={form.dob}
                          onChange={e => setForm(prev => ({ ...prev, dob: e.target.value }))}
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none focus:border-violet-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-400">Gender</label>
                        <select
                          value={form.gender}
                          onChange={e => setForm(prev => ({ ...prev, gender: e.target.value }))}
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none focus:border-violet-500"
                        >
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-400">Marital Status</label>
                        <select
                          value={form.maritalStatus}
                          onChange={e => setForm(prev => ({ ...prev, maritalStatus: e.target.value }))}
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none focus:border-violet-500"
                        >
                          <option value="">Select Status</option>
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                          <option value="Divorced">Divorced</option>
                          <option value="Widowed">Widowed</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-400">Father's Name</label>
                        <input
                          type="text"
                          value={form.fatherName}
                          onChange={e => setForm(prev => ({ ...prev, fatherName: e.target.value }))}
                          placeholder="Father's Name"
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none focus:border-violet-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-400">Mother's Name</label>
                      <input
                        type="text"
                        value={form.motherName}
                        onChange={e => setForm(prev => ({ ...prev, motherName: e.target.value }))}
                        placeholder="Mother's Name"
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none focus:border-violet-500"
                      />
                    </div>

                    <div className="border-t border-slate-800/80 pt-2.5 space-y-2">
                      <p className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">Address Details</p>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-400">Street</label>
                        <input
                          type="text"
                          value={form.street}
                          onChange={e => setForm(prev => ({ ...prev, street: e.target.value }))}
                          placeholder="123 Main St"
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none focus:border-violet-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-400">City</label>
                          <input
                            type="text"
                            value={form.city}
                            onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))}
                            placeholder="City"
                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none focus:border-violet-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-400">State</label>
                          <input
                            type="text"
                            value={form.state}
                            onChange={e => setForm(prev => ({ ...prev, state: e.target.value }))}
                            placeholder="State"
                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none focus:border-violet-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-400">ZIP Code</label>
                          <input
                            type="text"
                            value={form.zip}
                            onChange={e => setForm(prev => ({ ...prev, zip: e.target.value }))}
                            placeholder="123456"
                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none focus:border-violet-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-400">Country</label>
                          <input
                            type="text"
                            value={form.country}
                            onChange={e => setForm(prev => ({ ...prev, country: e.target.value }))}
                            placeholder="Country"
                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none focus:border-violet-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </details>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-400">Cover Note / Additional Comments</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Tell us why you'd be a great fit..."
                    rows={3}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none focus:border-violet-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={applying}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-violet-500/10 cursor-pointer disabled:opacity-50"
                >
                  {applying ? 'Submitting Application...' : 'Submit Application'} <Send className="h-3.5 w-3.5" />
                </button>
              </form >
            </div >
          </div >
        )
      }
    </div >
  );
}