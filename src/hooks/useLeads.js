import { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

export function useLeads() {
    const [leads, setLeads] = useState([]);
    const [blueprint, setBlueprint] = useState(null);
    const [tags, setTags] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');


    // Helper function to get token
    const getAuthToken = async () => {
        try {
            const { tokens } = await fetchAuthSession();
            return tokens?.idToken?.toString();
        } catch (e) {
            console.error("Auth error:", e);
            return null;
        }
    };

    const extractTags = (leadsData) => {
        const allTags = [];
        leadsData.forEach(lead => {
            try {
                const leadTags = Array.isArray(lead.tags) ? lead.tags : JSON.parse(lead.tags || "[]");
                leadTags.forEach(tag => {
                    if (!allTags.find(t => t.name === tag.name)) {
                        allTags.push(tag);
                    }
                });
            } catch (e) { }
        });
        setTags(allTags);
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const token = await getAuthToken();
            if (!token) return;
            const headers = { Authorization: `Bearer ${token}` };

            // Parallel fetching for 3x speed!
            const [meRes, bpRes, leadsRes] = await Promise.all([
                fetch('/api/me', { headers }),
                fetch('/api/blueprint?moduleType=Lead', { headers }),
                fetch('/api/leads', { headers })
            ]);

            const meData = await meRes.json();
            setCurrentUser(meData);

            const bpData = await bpRes.json();
            setBlueprint(bpData);

            if (leadsRes.ok) {
                const leadsData = await leadsRes.json();
                setLeads(leadsData);
                extractTags(leadsData);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchOnlyLeads = async (q = '') => {
        try {
            const token = await getAuthToken();
            const headers = { Authorization: `Bearer ${token}` };
            const url = q ? `/api/leads?q=${encodeURIComponent(q)}` : '/api/leads';
            const res = await fetch(url, { headers });
            if (res.ok) {
                const data = await res.json();
                setLeads(data);
            }
        } catch (e) {
            console.error('Search fetch error:', e);
        }
    };

    // Jab hook load ho tab initial data mangwa lo
    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchQuery.length >= 3 || searchQuery.length === 0) {
                fetchOnlyLeads(searchQuery);
            } else if (searchQuery.length === 0) {
                fetchOnlyLeads('');
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    return {
        leads,
        setLeads, // in case UI needs to update it locally
        blueprint,
        tags,
        currentUser,
        isLoading,
        fetchData,
        fetchOnlyLeads,
        searchQuery,
        setSearchQuery
    };
}
