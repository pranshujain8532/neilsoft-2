/**
 * Database Seed Script
 * Creates sample data for plants, products, and containers
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Sample Plants Data
const plants = [
    {
        name: 'Gujarat Green H2 Plant',
        location: {
            address: 'Gujarat Industrial Estate, Ahmedabad',
            coordinates: {
                lat: 23.0225,
                lng: 72.5714
            }
        },
        capacity: 150, // MW
        energySources: {
            solar: {
                installedCapacity: 80,
                currentOutput: 65,
                efficiency: 0.18,
                contribution: 54.2
            },
            wind: {
                installedCapacity: 50,
                currentOutput: 38,
                turbineCount: 10,
                contribution: 31.7
            },
            hydro: {
                installedCapacity: 20,
                currentOutput: 17,
                flowRate: 45,
                contribution: 14.1
            }
        },
        currentProduction: 2500, // kg/day
        lcoh: 1.75, // $/kg
        efficiency: 0.85,
        status: 'operational',
        certifications: ['ISO 50001', 'Green Hydrogen', 'Blockchain Verified'],
        profitability: {
            dailyProfit: 15000,
            monthlyProfit: 450000,
            profitMargin: 0.35,
            roi: 0.22
        }
    },
    {
        name: 'Maharashtra Hydro-Wind Plant',
        location: {
            address: 'Pune Industrial Zone, Maharashtra',
            coordinates: {
                lat: 18.5204,
                lng: 73.8567
            }
        },
        capacity: 120,
        energySources: {
            solar: {
                installedCapacity: 40,
                currentOutput: 32,
                efficiency: 0.17,
                contribution: 35.5
            },
            wind: {
                installedCapacity: 60,
                currentOutput: 48,
                turbineCount: 15,
                contribution: 53.3
            },
            hydro: {
                installedCapacity: 20,
                currentOutput: 10,
                flowRate: 30,
                contribution: 11.2
            }
        },
        currentProduction: 2200,
        lcoh: 1.92,
        efficiency: 0.82,
        status: 'operational',
        certifications: ['ISO 50001', 'Green Hydrogen'],
        profitability: {
            dailyProfit: 12000,
            monthlyProfit: 360000,
            profitMargin: 0.28,
            roi: 0.18
        }
    },
    {
        name: 'Tamil Nadu Solar Hub',
        location: {
            address: 'Chennai Energy Park, Tamil Nadu',
            coordinates: {
                lat: 13.0827,
                lng: 80.2707
            }
        },
        capacity: 100,
        energySources: {
            solar: {
                installedCapacity: 70,
                currentOutput: 58,
                efficiency: 0.19,
                contribution: 72.5
            },
            wind: {
                installedCapacity: 25,
                currentOutput: 18,
                turbineCount: 8,
                contribution: 22.5
            },
            hydro: {
                installedCapacity: 5,
                currentOutput: 4,
                flowRate: 15,
                contribution: 5.0
            }
        },
        currentProduction: 1800,
        lcoh: 2.05,
        efficiency: 0.80,
        status: 'operational',
        certifications: ['ISO 50001', 'Green Hydrogen'],
        profitability: {
            dailyProfit: 10000,
            monthlyProfit: 300000,
            profitMargin: 0.25,
            roi: 0.15
        }
    }
];

// Sample Products
const products = [
    {
        name: 'Industrial Grade Hydrogen',
        description: 'High-purity hydrogen (99.9%) for industrial applications',
        purity: 0.999,
        pricePerKg: 2.80,
        minOrder: 100,
        maxOrder: 10000,
        available: true,
        category: 'industrial',
        certifications: ['ISO 14687-2', 'Green Certificate']
    },
    {
        name: 'Premium Grade Hydrogen',
        description: 'Ultra-pure hydrogen (99.999%) for specialized applications',
        purity: 0.99999,
        pricePerKg: 4.20,
        minOrder: 50,
        maxOrder: 5000,
        available: true,
        category: 'premium',
        certifications: ['ISO 14687-2', 'Fuel Cell Grade', 'Green Certificate']
    },
    {
        name: 'Bulk Industrial Hydrogen',
        description: 'Cost-effective hydrogen for large-scale industrial use',
        purity: 0.995,
        pricePerKg: 2.50,
        minOrder: 500,
        maxOrder: 50000,
        available: true,
        category: 'bulk',
        certifications: ['ISO 14687-2', 'Green Certificate']
    }
];

// Sample Containers
const containers = [
    {
        type: 'Type I - Steel',
        capacity: 50,
        pressure: 200,
        weight: 150,
        certification: 'DOT-3AA',
        available: 25,
        pricePerUnit: 500
    },
    {
        type: 'Type III - Composite',
        capacity: 80,
        pressure: 350,
        weight: 90,
        certification: 'ISO 11439',
        available: 15,
        pricePerUnit: 1200
    },
    {
        type: 'Type IV - Carbon Fiber',
        capacity: 100,
        pressure: 700,
        weight: 65,
        certification: 'SAE J2579',
        available: 10,
        pricePerUnit: 2500
    }
];

async function seedDatabase() {
    try {
        console.log('🌱 Starting database seed...');

        // Connect to MongoDB (or use in-memory if not available)
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/green-hydrogen';

        try {
            await mongoose.connect(mongoUri);
            console.log('✅ Connected to MongoDB');
        } catch (err) {
            console.log('⚠️  MongoDB not available, data will be used in-memory');
            console.log('   Plants, products, and containers are defined for API usage');
            return {
                plants,
                products,
                containers
            };
        }

        // Clear existing data
        const Plant = require('./src/models/Plant');
        const Product = require('./src/models/Product');
        const Container = require('./src/models/Container');

        await Plant.deleteMany({});
        await Product.deleteMany({});
        await Container.deleteMany({});

        console.log('🗑️  Cleared existing data');

        // Insert seed data
        await Plant.insertMany(plants);
        await Product.insertMany(products);
        await Container.insertMany(containers);

        console.log('✅ Seed data inserted successfully!');
        console.log(`   - ${plants.length} plants`);
        console.log(`   - ${products.length} products`);
        console.log(`   - ${containers.length} containers`);

        mongoose.connection.close();
        console.log('🔒 Database connection closed');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

// Export data for use without MongoDB
module.exports = {
    plants,
    products,
    containers,
    seedDatabase
};

// Run if executed directly
if (require.main === module) {
    seedDatabase();
}
