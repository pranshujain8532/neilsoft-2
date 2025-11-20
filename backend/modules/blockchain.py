import hashlib
import json
from datetime import datetime

class BlockchainCertification:
    """
    Simplified blockchain for Green Hydrogen certification.
    Tracks production batches with immutable records.
    """
    
    def __init__(self):
        self.chain = []
        self.create_genesis_block()
    
    def create_genesis_block(self):
        """Create the first block in the chain"""
        genesis_block = {
            "index": 0,
            "timestamp": datetime.now().isoformat(),
            "data": "Genesis Block - H2-OptiPlant Certification System",
            "previous_hash": "0",
            "hash": self.calculate_hash(0, datetime.now().isoformat(), "Genesis Block", "0")
        }
        self.chain.append(genesis_block)
    
    def calculate_hash(self, index, timestamp, data, previous_hash):
        """Calculate SHA-256 hash of block"""
        block_string = f"{index}{timestamp}{json.dumps(data)}{previous_hash}"
        return hashlib.sha256(block_string.encode()).hexdigest()
    
    def add_certification(self, production_data):
        """Add a new certification block"""
        previous_block = self.chain[-1]
        index = len(self.chain)
        timestamp = datetime.now().isoformat()
        
        # Create certification data
        cert_data = {
            "batch_id": f"H2-{index:06d}",
            "quantity_kg": production_data.get("quantity_kg", 0),
            "energy_source": production_data.get("energy_source", "Mixed"),
            "carbon_intensity": production_data.get("carbon_intensity", 0),
            "production_timestamp": timestamp,
            "quality_grade": "Green",
            "certification_standard": "ISO 14687-2"
        }
        
        new_block = {
            "index": index,
            "timestamp": timestamp,
            "data": cert_data,
            "previous_hash": previous_block["hash"],
            "hash": self.calculate_hash(index, timestamp, cert_data, previous_block["hash"])
        }
        
        self.chain.append(new_block)
        return new_block
    
    def verify_chain(self):
        """Verify the integrity of the blockchain"""
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i-1]
            
            # Verify hash
            calculated_hash = self.calculate_hash(
                current["index"],
                current["timestamp"],
                current["data"],
                current["previous_hash"]
            )
            
            if current["hash"] != calculated_hash:
                return False
            
            # Verify chain linkage
            if current["previous_hash"] != previous["hash"]:
                return False
        
        return True
    
    def get_recent_certifications(self, count=5):
        """Get the most recent certifications"""
        return self.chain[-count:] if len(self.chain) > count else self.chain[1:]

# Global blockchain instance
blockchain = BlockchainCertification()

def certify_production_batch(quantity_kg, energy_mix):
    """Create a certification for a production batch"""
    production_data = {
        "quantity_kg": quantity_kg,
        "energy_source": energy_mix,
        "carbon_intensity": 0.0,  # Green hydrogen has zero carbon
    }
    return blockchain.add_certification(production_data)

def get_certifications():
    """Get recent certifications"""
    return {
        "total_blocks": len(blockchain.chain),
        "chain_valid": blockchain.verify_chain(),
        "recent_certifications": blockchain.get_recent_certifications(),
        "total_certified_h2_kg": sum(
            block["data"].get("quantity_kg", 0) 
            for block in blockchain.chain[1:] 
            if isinstance(block["data"], dict)
        )
    }
