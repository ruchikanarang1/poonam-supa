import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
    return (
        <div style={{ backgroundColor: 'white' }}>

            {/* Hero Section */}
            <section style={{ backgroundColor: 'var(--color-secondary)', padding: 'var(--spacing-xl) 0', textAlign: 'center' }}>
                <div className="container" style={{ maxWidth: '800px' }}>
                    <h1 style={{ fontSize: '3rem', color: 'var(--color-accent-blue)', marginBottom: 'var(--spacing-md)', letterSpacing: '-0.5px' }}>
                        Premium Wholesale Steel Solutions
                    </h1>
                    <p style={{ fontSize: '1.2rem', color: 'var(--color-text-light)', marginBottom: 'var(--spacing-lg)' }}>
                        Poonam Steel offers industry-leading durability, precision-engineered dimensions, and unmatched quality for all your construction and manufacturing needs.
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center' }}>
                        <Link to="/catalogue" className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '0.8rem 2rem' }}>
                            Browse Catalogue
                        </Link>
                        <Link to="/catalogue" className="btn btn-outline" style={{ fontSize: '1.1rem', padding: '0.8rem 2rem' }}>
                            View Categories
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="container" style={{ padding: 'var(--spacing-xl) var(--spacing-md)' }}>
                <h2 style={{ textAlign: 'center', color: 'var(--color-accent-blue)', marginBottom: 'var(--spacing-xl)' }}>Why Choose Poonam Steel?</h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-lg)' }}>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: 'var(--spacing-md)', fontSize: '1.5rem', fontWeight: 'bold' }}>1</div>
                        <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Unmatched Quality</h3>
                        <p style={{ color: 'var(--color-text-light)' }}>Sourced from the best, our steel meets all industrial standards for high-stress applications.</p>
                    </div>

                    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--color-accent-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: 'var(--spacing-md)', fontSize: '1.5rem', fontWeight: 'bold' }}>2</div>
                        <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Extensive Catalogue</h3>
                        <p style={{ color: 'var(--color-text-light)' }}>From TMT bars to MS angles, we provide a massive variety of dimensions and grades.</p>
                    </div>

                    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: 'var(--spacing-md)', fontSize: '1.5rem', fontWeight: 'bold' }}>3</div>
                        <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Wholesale Direct</h3>
                        <p style={{ color: 'var(--color-text-light)' }}>Optimized ordering process directly connecting your enterprise to our vast inventory.</p>
                    </div>
                </div>
            </section>

        </div>
    );
}
