"use client";

import { useState, useEffect } from "react";


// Helper components
const CountUp = ({ end, duration = 1500 }: { end: number; duration?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <>{count}</>;
};

export default function Home() {
  const [userUrl, setUserUrl] = useState("");
  const [compUrl, setCompUrl] = useState("");
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Results State
  const [results, setResults] = useState<{
    userScore: number;
    compScore: number;
    userWins: boolean;
    metrics: {
      user: any;
      comp: any;
    };
  } | null>(null);

  // Toggle states for info sections
  const [expandedOnPage, setExpandedOnPage] = useState(false);
  const [expandedTech, setExpandedTech] = useState(false);
  const [expandedAuth, setExpandedAuth] = useState(false);

  const startDuel = async () => {
    if (!userUrl.trim() || !compUrl.trim()) {
      setError(true);
      return;
    }
    setError(false);
    setIsLoading(true);

    try {
      const fetchAnalysis = async (url: string) => {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url })
        });
        if (!res.ok) throw new Error("Analysis failed");
        return res.json();
      };

      const [userData, compData] = await Promise.all([
        fetchAnalysis(userUrl),
        fetchAnalysis(compUrl)
      ]);

      const calculateScore = (data: any) => {
        let score = 100;
        if (!data.onpage.title.exists) score -= 20;
        else if (data.onpage.title.length < 30 || data.onpage.title.length > 60) score -= 5;

        if (!data.onpage.meta.exists) score -= 15;
        if (!data.onpage.headings.h1Exists) score -= 15;
        if (!data.onpage.headings.h1Unique) score -= 5;
        if (data.onpage.content.wordCount < 300) score -= 10;

        if (!data.technical.https) score -= 10;
        if (data.technical.noindex) score -= 20;

        return Math.max(0, score);
      };

      const mapMetrics = (data: any) => ({
        title: data.onpage.title.exists ? `${data.onpage.title.length} chars` : "Missing",
        isTitleGood: data.onpage.title.exists && data.onpage.title.length >= 30 && data.onpage.title.length <= 60,

        desc: data.onpage.meta.exists ? "Optimized" : "Missing",
        isDescGood: data.onpage.meta.exists,

        headings: data.onpage.headings.h1Exists ? (data.onpage.headings.h1Unique ? "Well Structured" : "Multiple H1s") : "Missing H1",
        isHeadingsGood: data.onpage.headings.h1Exists && data.onpage.headings.h1Unique,

        wc: data.onpage.content.wordCount,

        mob: data.technical.https ? "Secure (HTTPS)" : "Not Secure",
        isMobGood: data.technical.https,
      });

      const userScore = calculateScore(userData);
      const compScore = calculateScore(compData);

      setResults({
        userScore,
        compScore,
        userWins: userScore >= compScore,
        metrics: {
          user: mapMetrics(userData),
          comp: mapMetrics(compData)
        }
      });

      setShowResults(true);

    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const resetDuel = () => {
    setShowResults(false);
    setResults(null);
    setUserUrl("");
    setCompUrl("");
  };

  const formatUrl = (url: string) => {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '');
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header>
        <div className="badge">⚔️ Compare SEO instantly • Free demo</div>
        <h1 className="logo">See who wins the SEO duel in seconds</h1>
        <p className="tagline">Enter your website and a competitor to instantly compare key SEO metrics and see who
          ranks stronger.</p>
      </header>

      {/* Main Input Section */}
      <main>
        <div className="duel-inputs">
          <div className="input-group">
            <label htmlFor="your-site">Your Website</label>
            <input
              type="text"
              id="your-site"
              placeholder="example.com"
              autoComplete="off"
              value={userUrl}
              onChange={(e) => {
                setUserUrl(e.target.value);
                if (e.target.value && compUrl) setError(false);
              }}
            />
          </div>

          <div className="vs-badge">VS</div>

          <div className="input-group">
            <label htmlFor="competitor-site">Competitor Website</label>
            <input
              type="text"
              id="competitor-site"
              placeholder="competitor.com"
              autoComplete="off"
              value={compUrl}
              onChange={(e) => {
                setCompUrl(e.target.value);
                if (userUrl && e.target.value) setError(false);
              }}
            />
          </div>
        </div>

        <div className="action-area">
          {!showResults && !isLoading && (
            <button id="start-duel-btn" className="primary-btn" onClick={startDuel}>Start Duel</button>
          )}

          {isLoading && (
            <div id="loading-indicator" className="loading">
              <div className="spinner"></div> Analyzing...
            </div>
          )}

          {error && (
            <p id="error-msg" className="error-message">Please enter both website URLs.</p>
          )}
        </div>

        <ul className="feature-list">
          <li><span className="check-icon">✓</span> 25+ SEO metrics</li>
          <li><span className="check-icon">✓</span> Instant comparison</li>
          <li><span className="check-icon">✓</span> No login required</li>
        </ul>
      </main>

      {/* Results Section */}
      {showResults && results && (
        <section id="result-section" className="results-container">

          <div className="score-cards">
            {/* Your Score */}
            <div className={`score-card ${results.userWins ? 'winner' : ''}`} id="card-user">
              <h3>Your Site</h3>
              <div className="score-circle">
                <svg viewBox="0 0 36 36" className="circular-chart user-chart">
                  <path className="circle-bg"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="circle" strokeDasharray={`${results.userScore}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <text x="18" y="20.35" className="percentage">
                    <CountUp end={results.userScore} />
                  </text>
                </svg>
              </div>
              <p className="url-label">{formatUrl(userUrl) || 'example.com'}</p>
            </div>

            {/* Competitor Score */}
            <div className={`score-card ${!results.userWins ? 'winner' : ''}`} id="card-competitor">
              <h3>Competitor</h3>
              <div className="score-circle">
                <svg viewBox="0 0 36 36" className="circular-chart competitor-chart">
                  <path className="circle-bg"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="circle" strokeDasharray={`${results.compScore}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <text x="18" y="20.35" className="percentage">
                    <CountUp end={results.compScore} />
                  </text>
                </svg>
              </div>
              <p className="url-label">{formatUrl(compUrl) || 'competitor.com'}</p>
            </div>
          </div>

          <div id="winner-banner" className="winner-banner" style={{
            background: results.userWins ? "linear-gradient(to right, #22c55e, #4ade80)" : "linear-gradient(to right, #ef4444, #f87171)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text" // Added standard property
          }}>
            <span id="winner-text">{results.userWins ? "You Win!" : "Competitor Wins"}</span>
          </div>

          {/* Comparison Table */}
          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th className="col-user">Your Site</th>
                  <th className="col-comp">Competitor</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Title Length</td>
                  <td style={{ color: results.metrics.user.isTitleGood ? 'var(--success)' : 'var(--text-muted)' }}>{results.metrics.user.title}</td>
                  <td style={{ color: results.metrics.comp.isTitleGood ? 'var(--success)' : 'var(--text-muted)' }}>{results.metrics.comp.title}</td>
                </tr>
                <tr>
                  <td>Meta Description</td>
                  <td style={{ color: results.metrics.user.isDescGood ? 'var(--success)' : 'var(--danger)' }}>{results.metrics.user.desc}</td>
                  <td style={{ color: results.metrics.comp.isDescGood ? 'var(--success)' : 'var(--danger)' }}>{results.metrics.comp.desc}</td>
                </tr>
                <tr>
                  <td>Headings</td>
                  <td style={{ color: results.metrics.user.isHeadingsGood ? 'var(--success)' : 'var(--warning)' }}>{results.metrics.user.headings}</td>
                  <td style={{ color: results.metrics.comp.isHeadingsGood ? 'var(--success)' : 'var(--warning)' }}>{results.metrics.comp.headings}</td>
                </tr>
                <tr>
                  <td>Word Count</td>
                  <td>{results.metrics.user.wc}</td>
                  <td>{results.metrics.comp.wc}</td>
                </tr>
                <tr>
                  <td>Mobile Friendly</td>
                  <td style={{ color: results.metrics.user.isMobGood ? 'var(--success)' : 'var(--danger)' }}>{results.metrics.user.mob}</td>
                  <td style={{ color: results.metrics.comp.isMobGood ? 'var(--success)' : 'var(--danger)' }}>{results.metrics.comp.mob}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <button id="reset-btn" className="secondary-btn" onClick={resetDuel}>New Comparison</button>
        </section>
      )}

      {/* SEO Checks Info Section */}
      <section className="info-section">
        <div className="info-header">
          <h2>What we analyze in this SEO duel</h2>
          <p>A clear breakdown of SEO checks used to determine the winner.</p>
        </div>

        <div className="info-grid">
          {/* Group 1 */}
          <div className="info-card">
            <h3>On-page SEO</h3>
            <p className="card-desc">Content and keyword optimization signals</p>
            <ul>
              <li>Title tag length</li>
              <li>Meta description quality</li>
              <li>Headings structure (H1–H3)</li>
              <li>Content length</li>
              <li>Keyword density</li>
            </ul>
            <ul className={`expanded-list ${expandedOnPage ? 'open' : ''}`} id="list-onpage">
              <li>Title keyword presence</li>
              <li>Meta description length</li>
              <li>H1 presence</li>
              <li>H1 uniqueness</li>
            </ul>
            <p className="check-count" onClick={() => setExpandedOnPage(!expandedOnPage)}>
              {expandedOnPage ? "Show less" : "Includes 9 checks"}
            </p>
          </div>

          {/* Group 2 */}
          <div className="info-card">
            <h3>Technical SEO</h3>
            <p className="card-desc">Crawlability, speed, and indexability checks</p>
            <ul>
              <li>Mobile friendliness</li>
              <li>Page speed</li>
              <li>HTTPS usage</li>
              <li>Indexability</li>
              <li>Core Web Vitals</li>
            </ul>
            <ul className={`expanded-list ${expandedTech ? 'open' : ''}`} id="list-tech">
              <li>Robots.txt presence</li>
              <li>Sitemap.xml presence</li>
              <li>Canonical tag</li>
              <li>Redirects</li>
            </ul>
            <p className="check-count" onClick={() => setExpandedTech(!expandedTech)}>
              {expandedTech ? "Show less" : "Includes 9 checks"}
            </p>
          </div>

          {/* Group 3 */}
          <div className="info-card">
            <h3>Authority</h3>
            <p className="card-desc">Trust and backlink-based ranking signals</p>
            <ul>
              <li>Backlinks (basic)</li>
              <li>Internal links</li>
              <li>External links</li>
              <li>Domain age</li>
            </ul>
            <ul className={`expanded-list ${expandedAuth ? 'open' : ''}`} id="list-auth">
              <li>Referring domains</li>
              <li>Nofollow ratio</li>
              <li>Anchor text diversity</li>
            </ul>
            <p className="check-count" onClick={() => setExpandedAuth(!expandedAuth)}>
              {expandedAuth ? "Show less" : "Includes 7 checks"}
            </p>
          </div>
        </div>
      </section>

      {/* Duel Results & Strategy Section */}
      <section className="strategy-section">
        <div className="section-header">
          <h2>Duel results & winning strategy</h2>
          <p>See who wins the SEO duel and what to improve to take the lead.</p>
        </div>

        <div className="strategy-grid">
          {/* Left Column: Legend */}
          <div className="strategy-col legend-col">
            <h3>Priority Legend</h3>
            <ul className="legend-list">
              <li className="legend-item critical">
                <span className="dot critical-dot"></span>
                <div>
                  <strong>Critical</strong>
                  <span> — blocks your rankings</span>
                </div>
              </li>
              <li className="legend-item warning">
                <span className="dot warning-dot"></span>
                <div>
                  <strong>Warning</strong>
                  <span> — limits growth</span>
                </div>
              </li>
              <li className="legend-item good">
                <span className="dot good-dot"></span>
                <div>
                  <strong>Good</strong>
                  <span> — already optimized</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Right Column: Results & Actions */}
          <div className="strategy-col content-col">
            {/* Result Card (Mock) */}
            <div className="strategy-result-card">
              <div className="strat-score-row">
                <div className={`strat-site ${results && results.userWins ? 'winner' : ''}`}>
                  <span className="site-name">Your Website</span>
                  <div className="strat-progress">
                    <div className="strat-bar user-bar" style={{ width: results ? `${Math.min(results.userScore, 100)}%` : '45%' }}></div>
                  </div>
                  <span className="score-num">{results ? results.userScore : 45}</span>
                </div>
                <div className={`strat-site ${results && !results.userWins ? 'winner' : ''}`}>
                  <span className="site-name">Competitor</span>
                  <div className="strat-progress">
                    <div className="strat-bar comp-bar" style={{ width: results ? `${Math.min(results.compScore, 100)}%` : '78%' }}></div>
                  </div>
                  <span className="score-num">{results ? results.compScore : 78}</span>
                </div>
              </div>
              <div className="strat-winner-badge" style={{ color: results ? (results.userWins ? 'var(--success)' : 'var(--accent)') : 'var(--accent)' }}>
                {results ? (results.userWins ? 'Winner: You' : 'Winner: Competitor') : 'Winner: Competitor'}
              </div>
            </div>

            {/* Action Plan */}
            <div className="action-plan">
              <h3>How to win this SEO duel</h3>

              <div className="action-item item-critical">
                <div className="icon-box">!</div>
                <div className="action-content">
                  <strong>Fix missing H1 tags</strong>
                  <p>Critical impact on search visibility.</p>
                </div>
              </div>

              <div className="action-item item-warning">
                <div className="icon-box">⚠</div>
                <div className="action-content">
                  <strong>Improve page speed</strong>
                  <p>Slow load times increase bounce rates.</p>
                </div>
              </div>

              <div className="action-item item-good">
                <div className="icon-box">✓</div>
                <div className="action-content">
                  <strong>HTTPS is active</strong>
                  <p>Secure connection established.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <p>SEOduel MVP — Demo version. Results are simulated.</p>
      </footer>

    </div>
  );
}
