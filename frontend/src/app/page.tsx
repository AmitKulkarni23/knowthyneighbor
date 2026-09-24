import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.board}>
      {/* ── Hero: Main flyer + side cards ── */}
      <section className={styles.hero}>
        {/* Main flyer */}
        <div className={styles.mainFlyer}>
          <div className={styles.pinRed} />
          <h1 className={styles.flyerTitle}>KnowThy Neighbor</h1>
          <p className={styles.flyerSubtitle}>
            Find couples in your neighborhood for shared meals
          </p>
          <p className={styles.flyerBody}>
            Create a simple couple profile with your name, age, and zip code.
            Browse other couples nearby. Send a request to join them for dinner,
            lunch, or brunch. Chat to plan the details. Then sit down and share a
            real meal with real people.
          </p>
          <div className={styles.privacyNote}>
            We only ask for your zip code. We never ask for or store your home
            address. Share it only when you&apos;re ready, directly in chat,
            after you&apos;ve done your own due diligence.
          </div>

          {/* CTA */}
          <div className={styles.flyerCta}>
            <a href="/login" className={styles.tearTabTorn}>Sign Up</a>
            <p className={styles.signInHint}>
              Already have an account? <a href="/login" className={styles.signInLink}>Sign in</a>
            </p>
          </div>
        </div>

        {/* Side cards */}
        <div className={styles.sideCards}>
          {/* Couple profile card */}
          <div className={styles.coupleCard}>
            <div className={styles.pinGreen} />
            <div className={styles.coupleCardName}>The Patels</div>
            <div className={styles.coupleCardMeta}>
              2.3 miles away &middot; 2 kids &middot; Love Thai food
            </div>
            <span className={styles.coupleCardTag}>Hosts</span>
          </div>

          {/* Handwritten index card */}
          <div className={styles.indexCard}>
            <div className={styles.pinBlue} />
            <p className={styles.indexCardText}>
              Looking for dinner friends! We just moved to the neighborhood and
              Saturdays work best for us. We make a mean lasagna.
            </p>
          </div>

          {/* Second couple card */}
          <div className={styles.coupleCard} style={{ transform: "rotate(-1deg)" }}>
            <div className={styles.pinRed} />
            <div className={styles.coupleCardName}>The Nguyens</div>
            <div className={styles.coupleCardMeta}>
              4.1 miles away &middot; No kids &middot; Brunch enthusiasts
            </div>
            <span className={styles.coupleCardTagVisitor}>Visitors</span>
          </div>

          {/* Calendar card */}
          <div className={styles.calendarCard}>
            <div className={styles.pinGreen} />
            <div className={styles.calendarTitle}>Our Availability</div>
            <div className={styles.calendarGrid}>
              <div className={styles.calendarSlot}>Mon</div>
              <div className={styles.calendarSlot}>Tue</div>
              <div className={styles.calendarSlot}>Wed</div>
              <div className={styles.calendarSlot}>Thu</div>
              <div className={styles.calendarSlotActive}>Fri Dinner</div>
              <div className={styles.calendarSlotActive}>Sat Brunch</div>
              <div className={styles.calendarSlotActive}>Sat Dinner</div>
              <div className={styles.calendarSlotActive}>Sun Lunch</div>
              <div className={styles.calendarSlot}>Sun</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className={styles.howSection}>
        <h2 className={styles.howTitle}>How It Works</h2>
        <div className={styles.howSteps}>
          <div className={styles.stepCard}>
            <div className={styles.pinRed} />
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepTitle}>Pin Your Card</div>
            <p className={styles.stepDesc}>
              Create a couple profile with your names, ages, and zip code. Your
              partner joins with a link you share.
            </p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.pinGreen} />
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepTitle}>Browse the Board</div>
            <p className={styles.stepDesc}>
              See other couples nearby. Filter by availability, meal type, and
              whether they host or visit.
            </p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.pinBlue} />
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepTitle}>Send a Request</div>
            <p className={styles.stepDesc}>
              Found someone interesting? Send a join request with a short note.
              They get an email and decide.
            </p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.pinRed} />
            <div className={styles.stepNumber}>4</div>
            <div className={styles.stepTitle}>Share a Meal</div>
            <p className={styles.stepDesc}>
              Once accepted, chat to plan the details. Pick a date, a meal type,
              and sit down together.
            </p>
          </div>
        </div>
      </section>

      {/* ── Promise / CTA ── */}
      <section className={styles.promiseSection}>
        <div className={styles.promiseCard}>
          <div className={styles.pinRed} />
          <h2 className={styles.promiseTitle}>No algorithms. No AI slop. Just neighbors.</h2>
          <p className={styles.promiseText}>
            We built this because people are tired of screens pretending to be
            connection. KnowThyNeighbor gets you off the app and around a table.
            The only thing we optimize for is a real meal with real people.
          </p>
          <a href="/login" className={styles.promiseCta}>Put Your Card on the Board</a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          KnowThyNeighbor &middot; Real meals with real neighbors
        </p>
      </footer>
    </div>
  );
}
