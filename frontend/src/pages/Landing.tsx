import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/controls";
import { LANDING, LANDING_AGENT_QA, LANDING_DEMO } from "../ui-text";

function LogoPutih({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label="Ikon BidMaster">
      <rect width="64" height="64" rx="15" fill="#FFFFFF" />
      <path d="M17 11H36L47 22V50A3 3 0 0 1 44 53H17A3 3 0 0 1 14 50V14A3 3 0 0 1 17 11Z" fill="#0F1B3D" />
      <path d="M36 11V19A3 3 0 0 0 39 22H47Z" fill="#3B4A80" />
      <path d="M21 22V43M21 22H27.5A5 5 0 0 1 27.5 32H21M21 32H29A5.5 5.5 0 0 1 29 43H21" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M47 35C47.7 40.5 50.5 43.3 56 44C50.5 44.7 47.7 47.5 47 53C46.3 47.5 43.5 44.7 38 44C43.5 43.3 46.3 40.5 47 35Z" fill="#FFB020" stroke="#FFFFFF" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke" />
    </svg>
  );
}

export default function Landing() {
  const [tipe, setTipe] = useState(0);
  const [jadi, setJadi] = useState(false);
  const [tanya, setTanya] = useState<[string, string][]>([]);
  const T = LANDING_DEMO[tipe];

  return (
    <main className="bg-[#F5F7FD] text-[#0F1B3D] -mt-0">
      {/* HERO */}
      <section className="relative overflow-hidden" style={{ background: "#0F1B3D" }}>
        <svg viewBox="0 0 64 64" className="absolute w-[640px] h-[640px] -right-30 top-10 opacity-90 pointer-events-none" aria-hidden="true">
          <path d="M17 11H36L47 22V50A3 3 0 0 1 44 53H17A3 3 0 0 1 14 50V14A3 3 0 0 1 17 11Z" fill="none" stroke="#1C2D5C" strokeWidth="0.5" />
          <path d="M21 22V43M21 22H27.5A5 5 0 0 1 27.5 32H21M21 32H29A5.5 5.5 0 0 1 29 43H21" fill="none" stroke="#1C2D5C" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <header className="relative max-w-[1160px] mx-auto px-6 pt-6 flex flex-wrap items-center justify-between gap-4">
          <span className="flex items-center gap-3">
            <LogoPutih />
            <span className="font-display text-2xl text-white tracking-tight"><span className="font-light">Bid</span><span className="font-extrabold">Master</span></span>
          </span>
          <nav aria-label="Navigasi utama" className="flex flex-wrap items-center gap-x-7 gap-y-2 text-[15px] font-medium text-[#C9D1F0]">
            <a className="hover:text-white transition-colors" href="#cara">Cara kerja</a>
            <a className="hover:text-white transition-colors" href="#demo">Coba langsung</a>
            <a className="hover:text-white transition-colors" href="#fitur">Fitur</a>
            <a className="hover:text-white transition-colors" href="#agen">Agen</a>
            <a className="hover:text-white transition-colors" href="#faq">FAQ</a>
            <Link to="/login" className="inline-flex items-center min-h-11 px-5 bg-[#FFB020] text-[#0F1B3D] rounded-xl font-semibold no-underline hover:brightness-105">Masuk</Link>
          </nav>
        </header>
        <div className="relative max-w-[1160px] mx-auto px-6 pt-[88px] pb-[150px]">
          <div className="max-w-[760px] flex flex-col gap-7">
            <span className="anim-fade-up inline-flex self-start items-center gap-2.5 px-3.5 py-1.5 border border-[#2C3E75] rounded-full text-[13px] font-semibold text-[#C9D1F0]">
              <span className="w-2 h-2 rounded-full bg-[#FFB020]" />{LANDING.badge}
            </span>
            <h1 className="anim-fade-up d1 font-display font-extrabold text-white tracking-tight leading-[1.06] text-[clamp(38px,5.4vw,68px)] m-0">{LANDING.h1}</h1>
            <p className="anim-fade-up d2 m-0 text-[19px] leading-relaxed text-[#C9D1F0] max-w-[620px]">{LANDING.sub}</p>
            <div className="anim-fade-up d3 flex flex-wrap gap-3.5">
              <Link to="/login" className="inline-flex items-center justify-center min-h-[52px] px-7 bg-[#FFB020] text-[#0F1B3D] rounded-[14px] text-base font-bold no-underline hover:brightness-105">{LANDING.masuk}</Link>
              <a href="#cara" className="inline-flex items-center justify-center min-h-[52px] px-7 border border-[#3B4A80] text-white rounded-[14px] text-base font-semibold no-underline hover:bg-white/5">{LANDING.cara}</a>
            </div>
            <p className="anim-fade-up d4 m-0 text-sm text-[#8E9BCB]">{LANDING.credit}</p>
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section id="demo" className="relative px-6" style={{ marginTop: "-100px" }}>
        <div className="max-w-[1160px] mx-auto bg-white border border-[#D9DDEE] rounded-[22px] overflow-hidden" style={{ boxShadow: "0 30px 70px -30px rgba(15,27,61,0.45)" }}>
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 bg-[#EEF0F8] border-b border-[#D9DDEE]">
            <div className="flex items-center gap-2" aria-hidden="true">
              <span className="w-[11px] h-[11px] rounded-full bg-[#C9D1F0]" />
              <span className="w-[11px] h-[11px] rounded-full bg-[#C9D1F0]" />
              <span className="w-[11px] h-[11px] rounded-full bg-[#C9D1F0]" />
            </div>
            <div className="text-[13px] font-semibold text-[#4A5578]">{LANDING.demoJudul}</div>
            <div className="text-xs font-semibold text-[#4A5578] px-2.5 py-[3px] border border-[#C9D1F0] rounded-full">Demo interaktif</div>
          </div>
          <div className="flex flex-wrap items-stretch">
            <div className="flex-1 basis-[280px] min-w-0 p-6 flex flex-col gap-[18px] border-r border-[#E3E6F2]">
              <div className="font-display font-bold text-[15px] tracking-wide uppercase text-[#4A5578]">1. Brief singkat</div>
              <div className="flex flex-col gap-2.5">
                <div className="text-sm font-semibold text-[#0F1B3D]">Jenis proposal</div>
                <div className="flex flex-wrap gap-2">
                  {LANDING_DEMO.map((d, i) => (
                    <button key={d.label} type="button" onClick={() => { setTipe(i); setJadi(false); setTanya([]); }}
                      aria-pressed={tipe === i}
                      className="min-h-11 px-4 rounded-xl text-sm font-semibold border transition-colors"
                      style={tipe === i
                        ? { background: "#0F1B3D", color: "#FFFFFF", borderColor: "#0F1B3D" }
                        : { background: "#FFFFFF", color: "#0F1B3D", borderColor: "#C9D1F0" }}>
                      {d.label}</button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 p-3.5 bg-[#F5F7FD] border border-[#E3E6F2] rounded-[14px]">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#4A5578]">Poin brief</div>
                <div className="text-sm text-[#0F1B3D]">{T.brief}</div>
              </div>
              <Button onClick={() => setJadi(true)} className="min-h-12 bg-[#0F1B3D] hover:bg-[#1a2450] text-white font-bold">Buat draft contoh</Button>
              {!jadi && <p className="text-sm text-[#4A5578] m-0">{LANDING.demoSiap}</p>}
            </div>
            <div className="flex-[2] basis-[420px] min-w-0 p-6 bg-[#F5F7FD] flex flex-col gap-3.5">
              <div className="font-display font-bold text-[15px] tracking-wide uppercase text-[#4A5578]">2. Draft proposal</div>
              {!jadi ? (
                <div className="min-h-[360px] flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-[#C9D1F0] rounded-2xl text-center">
                  <div className="text-[15px] font-semibold text-[#0F1B3D]">{LANDING.demoKosongJudul}</div>
                  <div className="text-sm text-[#4A5578] max-w-[320px]">{LANDING.demoKosongKet}</div>
                </div>
              ) : (
                <div className="bg-white border border-[#D9DDEE] rounded-[14px] p-7 flex flex-col gap-4" style={{ boxShadow: "0 8px 24px -16px rgba(15,27,61,0.4)" }}>
                  <span className="self-start text-xs font-semibold px-2.5 py-[3px] rounded-full bg-[#E4E8F8] text-[#0F1B3D]">{T.label}</span>
                  <h3 className="m-0 font-display font-extrabold text-2xl text-[#0F1B3D]">{T.title}</h3>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-[#8A5A00]">Ringkasan</div>
                    <div className="text-[15px] text-[#1B2A52] mt-1.5">{T.summary}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-[#8A5A00]">Ruang lingkup</div>
                    <div className="flex flex-col gap-1.5 mt-1.5">
                      {T.scope.map((s) => (
                        <div key={s} className="flex gap-2.5 text-[15px] text-[#1B2A52]">
                          <span className="flex-none w-1.5 h-1.5 mt-2 rounded-full bg-[#FFB020]" />{s}</div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-[#8A5A00]">Jadwal &amp; investasi</div>
                    <div className="flex flex-col mt-1.5 border border-[#E3E6F2] rounded-[10px] overflow-hidden">
                      {T.timeline.map(([a, b]) => (
                        <div key={a} className="flex flex-wrap justify-between gap-x-4 px-3.5 py-2.5 text-sm border-b border-[#EEF0F8] last:border-0">
                          <span className="font-semibold text-[#0F1B3D]">{a}</span><span className="text-[#4A5578]">{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 basis-[300px] min-w-0 p-6 text-white flex flex-col gap-3.5" style={{ background: "#0F1B3D" }}>
              <div className="flex items-center gap-2 font-display font-bold text-[15px] uppercase tracking-wide text-[#C9D1F0]">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#FFB020" aria-hidden="true"><path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z" /></svg>
                3. Agen contoh
              </div>
              <div className="flex-1 min-h-[190px] max-h-[300px] overflow-y-auto flex flex-col gap-2.5">
                {tanya.length === 0 && <div className="text-sm text-[#8E9BCB]">{LANDING.demoAgenSiap}</div>}
                {tanya.map(([q, a], i) => (
                  <div key={i} className="flex flex-col gap-2.5">
                    <div className="self-end max-w-[88%] px-3.5 py-2.5 bg-[#FFB020] text-[#0F1B3D] rounded-[14px] rounded-br text-sm font-semibold">{q}</div>
                    <div className="self-start max-w-[92%] px-3.5 py-2.5 bg-[#1C2D5C] text-white rounded-[14px] rounded-bl text-sm">{a}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#8E9BCB]">Coba perintah</div>
                <div className="flex flex-wrap gap-2">
                  {LANDING_AGENT_QA.map(([q, a]) => (
                    <button key={q} type="button" disabled={!jadi} onClick={() => setTanya((m) => [...m, [q, a]])}
                      className="min-h-11 px-3.5 bg-[#1C2D5C] text-white border border-[#3B4A80] rounded-xl text-[13px] font-semibold disabled:opacity-45 hover:border-[#FFB020] transition-colors">
                      {q}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CARA KERJA */}
      <section id="cara" className="max-w-[1160px] mx-auto px-6 pt-[120px]">
        <div className="flex flex-col gap-3 max-w-[640px]">
          <div className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#8A5A00]">Cara kerja</div>
          <h2 className="m-0 font-display font-extrabold text-[#0F1B3D] tracking-tight leading-[1.12] text-[clamp(30px,3.6vw,44px)]">Dari dokumen tender ke proposal siap kirim dalam tiga langkah.</h2>
        </div>
        <div className="mt-10 flex flex-wrap gap-5">
          {LANDING.langkah.map(([t, d], i) => (
            <div key={t} className="anim-fade-up flex-1 basis-[300px] min-w-0 p-7 bg-white border border-[#D9DDEE] rounded-[18px] flex flex-col gap-3" style={{ animationDelay: `${i * 90}ms` } as React.CSSProperties}>
              <div className="font-display font-extrabold text-[40px] leading-none text-[#FFB020]" style={{ WebkitTextStroke: "1px #0F1B3D" }}>0{i + 1}</div>
              <h3 className="m-0 font-display font-bold text-xl text-[#0F1B3D]">{t}</h3>
              <p className="m-0 text-[#4A5578]">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FITUR */}
      <section id="fitur" className="max-w-[1160px] mx-auto px-6 pt-[120px]">
        <div className="flex flex-col gap-3 max-w-[640px]">
          <div className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#8A5A00]">Fitur</div>
          <h2 className="m-0 font-display font-extrabold text-[#0F1B3D] tracking-tight leading-[1.12] text-[clamp(30px,3.6vw,44px)]">Satu tools untuk tim yang proposalnya tidak boleh salah.</h2>
        </div>
        <div className="mt-10 flex flex-wrap gap-5">
          {LANDING.fitur.map(([t, d], i) => (
            <div key={t} className="anim-fade-up flex-1 basis-[320px] min-w-0 p-[26px] bg-white border border-[#D9DDEE] rounded-[18px] flex flex-col gap-3.5" style={{ animationDelay: `${i * 70}ms` } as React.CSSProperties}>
              <div className={`w-[46px] h-[46px] flex items-center justify-center rounded-xl ${i === 2 ? "bg-[#FFE8BD] text-[#5A3A00]" : "bg-[#E4E8F8] text-[#0F1B3D]"}`}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {i === 0 && <><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /><path d="M10 13h6M10 17h6" /></>}
                  {i === 1 && <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />}
                  {i === 2 && <path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z" />}
                  {i === 3 && <><rect x="4" y="4" width="16" height="5" rx="1" /><rect x="4" y="11" width="16" height="5" rx="1" /><path d="M4 19h16" /></>}
                  {i === 4 && <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 5a3 3 0 0 1 0 6M18 14c1.9.6 3 2.4 3 5" /></>}
                  {i === 5 && <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />}
                </svg>
              </div>
              <h3 className="m-0 font-display font-bold text-lg text-[#0F1B3D]">{t}</h3>
              <p className="m-0 text-[#4A5578] text-[15px]">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AGEN */}
      <section id="agen" className="max-w-[1160px] mx-auto px-6 pt-[120px]">
        <div className="rounded-[28px] p-12 flex flex-wrap gap-10 items-center" style={{ background: "#0F1B3D" }}>
          <div className="flex-1 basis-[380px] min-w-0 flex flex-col gap-[18px]">
            <div className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#FFB020]">{LANDING.agenJudul.split(" ").slice(0, 2).join(" ")}</div>
            <h2 className="m-0 font-display font-extrabold text-white tracking-tight leading-[1.14] text-[clamp(28px,3.4vw,40px)]">{LANDING.agenJudul}</h2>
            <p className="m-0 text-[17px] text-[#C9D1F0]">{LANDING.agenKet}</p>
            <Link to="/login" className="self-start inline-flex items-center justify-center min-h-[52px] px-7 bg-[#FFB020] text-[#0F1B3D] rounded-[14px] text-base font-bold no-underline hover:brightness-105">{LANDING.masuk}</Link>
          </div>
          <div className="flex-1 basis-[360px] min-w-0 flex flex-wrap gap-2.5">
            {["Tandai butir yang belum pasti", "Petakan KAK ke komponen harga", "Susun matriks kepatuhan", "Buatkan daftar klarifikasi", "Samakan istilah antar bab"].map((c, i) => (
              <span key={c} className={`px-[18px] py-3 rounded-full text-[15px] ${i === 4 ? "bg-[#FFB020] text-[#0F1B3D] font-semibold" : "bg-[#1C2D5C] border border-[#3B4A80] text-white"}`}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* UNTUK SIAPA */}
      <section className="max-w-[1160px] mx-auto px-6 pt-[120px]">
        <div className="flex flex-col gap-3 max-w-[640px]">
          <div className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#8A5A00]">Untuk siapa</div>
          <h2 className="m-0 font-display font-extrabold text-[#0F1B3D] tracking-tight leading-[1.12] text-[clamp(30px,3.6vw,44px)]">Dibuat untuk tim yang proposalnya tidak boleh telat.</h2>
        </div>
        <div className="mt-10 flex flex-wrap gap-5">
          {LANDING.untukSiapa.map(([t, d]) => (
            <div key={t} className="flex-1 basis-[300px] min-w-0 p-7 border border-[#C9D1F0] rounded-[18px] bg-white flex flex-col gap-2.5">
              <h3 className="m-0 font-display font-bold text-[19px] text-[#0F1B3D]">{t}</h3>
              <p className="m-0 text-[#4A5578]">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-[1160px] mx-auto px-6 pt-[120px]">
        <div className="flex flex-col gap-3 max-w-[640px]">
          <div className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#8A5A00]">FAQ</div>
          <h2 className="m-0 font-display font-extrabold text-[#0F1B3D] tracking-tight leading-[1.12] text-[clamp(30px,3.6vw,44px)]">Pertanyaan yang sering muncul.</h2>
        </div>
        <div className="mt-10 flex flex-wrap gap-x-10 gap-y-5">
          {LANDING.faq.map(([t, d]) => (
            <div key={t} className="flex-1 basis-[440px] min-w-0 flex flex-col gap-1.5 pb-5 border-b border-[#D9DDEE]">
              <h3 className="m-0 font-display font-bold text-[17px] text-[#0F1B3D]">{t}</h3>
              <p className="m-0 text-[#4A5578]">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1160px] mx-auto px-6 pt-[120px] pb-24">
        <div className="rounded-[28px] p-12 flex flex-wrap items-center justify-between gap-7" style={{ background: "#FFB020" }}>
          <div className="flex-1 basis-[400px] min-w-0 flex flex-col gap-2.5">
            <h2 className="m-0 font-display font-extrabold text-[#0F1B3D] tracking-tight leading-[1.14] text-[clamp(28px,3.4vw,40px)]">{LANDING.ctaJudul}</h2>
            <p className="m-0 text-[17px] text-[#3A2A00]">{LANDING.ctaKet}</p>
          </div>
          <div className="flex flex-wrap gap-3.5">
            <Link to="/login" className="inline-flex items-center justify-center min-h-[52px] px-7 bg-[#0F1B3D] text-white rounded-[14px] text-base font-bold no-underline hover:brightness-125">{LANDING.ctaMasuk}</Link>
            <a href="#cara" className="inline-flex items-center justify-center min-h-[52px] px-7 border-2 border-[#0F1B3D] text-[#0F1B3D] rounded-[14px] text-base font-bold no-underline">{LANDING.ctaCara}</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#0F1B3D", color: "#C9D1F0" }}>
        <div className="max-w-[1160px] mx-auto px-6 py-12 flex flex-wrap justify-between gap-8">
          <div className="flex-1 basis-[320px] flex flex-col gap-3.5">
            <span className="flex items-center gap-3">
              <LogoPutih size={36} />
              <span className="font-display text-[22px] text-white tracking-tight"><span className="font-light">Bid</span><span className="font-extrabold">Master</span></span>
            </span>
            <div className="text-sm max-w-[360px]">{LANDING.footerKet}</div>
          </div>
          <nav aria-label="Tautan footer" className="flex flex-wrap gap-x-7 gap-y-2.5 text-sm items-start">
            <a className="hover:text-white transition-colors no-underline" href="#cara">Cara kerja</a>
            <a className="hover:text-white transition-colors no-underline" href="#fitur">Fitur</a>
            <a className="hover:text-white transition-colors no-underline" href="#agen">Agen</a>
            <a className="hover:text-white transition-colors no-underline" href="#faq">FAQ</a>
          </nav>
        </div>
        <div className="border-t border-[#24356B]">
          <div className="max-w-[1160px] mx-auto px-6 py-5 text-[13px] text-[#8E9BCB]">{LANDING.footerHak}</div>
        </div>
      </footer>
    </main>
  );
}
