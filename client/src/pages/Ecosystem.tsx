import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Users, Rocket, MapPin, Search, Plus, Map as MapIcon, List, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { MapView } from "@/components/Map";
import { toast } from "sonner";

type EntityType = "hub" | "community" | "startup";

// All Uganda districts for filtering
const ALL_DISTRICTS = [
  // Central Region
  "Kampala", "Wakiso", "Mukono", "Mpigi", "Luwero", "Nakaseke", "Nakasongola", "Kayunga", "Buikwe", "Buvuma", "Kalangala", "Masaka", "Rakai", "Lyantonde", "Sembabule", "Kalungu", "Butambala", "Gomba", "Mityana", "Mubende", "Kiboga", "Kyankwanzi",
  // Eastern Region  
  "Jinja", "Mbale", "Soroti", "Tororo", "Iganga", "Mayuge", "Kamuli", "Buyende", "Luuka", "Namutumba", "Bugiri", "Busia", "Manafwa", "Bududa", "Sironko", "Bulambuli", "Kapchorwa", "Kween", "Bukwo", "Pallisa", "Budaka", "Kibuku", "Serere", "Ngora", "Kumi", "Bukedea", "Kaberamaido", "Katakwi", "Amuria", "Napak", "Amudat", "Nakapiripirit", "Moroto", "Kotido", "Kaabong", "Abim",
  // Northern Region
  "Gulu", "Lira", "Arua", "Kitgum", "Pader", "Agago", "Lamwo", "Amuru", "Nwoya", "Oyam", "Apac", "Kole", "Dokolo", "Alebtong", "Otuke", "Yumbe", "Moyo", "Adjumani", "Obongi", "Madi-Okollo", "Pakwach", "Nebbi", "Zombo", "Koboko",
  // Western Region
  "Mbarara", "Fort Portal", "Kasese", "Kabale", "Bushenyi", "Ntungamo", "Rukungiri", "Kanungu", "Kisoro", "Rubanda", "Mitooma", "Sheema", "Buhweju", "Rubirizi", "Ibanda", "Isingiro", "Kiruhura", "Lwengo", "Hoima", "Masindi", "Kibaale", "Kakumiro", "Kiryandongo", "Buliisa", "Bundibugyo", "Ntoroko", "Kabarole", "Kamwenge", "Kyenjojo", "Kyegegwa", "Bunyangabu"
].sort();

interface Entity {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  location?: string | null;
  address?: string | null;
  verified?: boolean;
  focusAreas?: string[] | null;
  type?: string | null;
  memberCount?: number | null;
  stage?: string | null;
  industry?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  slack?: string | null;
  discord?: string | null;
  telegram?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
  founded?: number | null;
  teamSize?: number | null;
  logo?: string | null;
}

export default function Ecosystem() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("hubs");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [showSubmissionModal, setShowSubmissionModal] = useState<'hub' | 'community' | 'startup' | null>(null);
  const [submissionForm, setSubmissionForm] = useState({
    name: '',
    description: '',
    location: '',
    website: '',
    email: '',
    phone: '',
  });
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Show all approved content immediately (anonymous submissions are auto-approved)
  const { data: hubs, isLoading: hubsLoading, refetch: refetchHubs } = trpc.hubs.list.useQuery({ status: "approved" });
  const { data: communities, isLoading: communitiesLoading, refetch: refetchCommunities } = trpc.communities.list.useQuery({ status: "approved" });
  const { data: startups, isLoading: startupsLoading, refetch: refetchStartups } = trpc.startups.list.useQuery({ status: "approved" });

  // Submission mutations
  const createHubMutation = trpc.hubs.create.useMutation();
  const createCommunityMutation = trpc.communities.create.useMutation();
  const createStartupMutation = trpc.startups.create.useMutation();

  const filterItems = (items: any[] | undefined, query: string, location: string) => {
    if (!items) return [];
    let filtered = items;
    
    if (query) {
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase()) ||
        item.location?.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    if (location && location.trim() !== "" && location !== "all") {
      filtered = filtered.filter(item =>
        item.location?.toLowerCase().includes(location.toLowerCase())
      );
    }
    
    return filtered;
  };

  const filteredHubs = filterItems(hubs, searchQuery, selectedLocation);
  const filteredCommunities = filterItems(communities, searchQuery, selectedLocation);
  const filteredStartups = filterItems(startups, searchQuery, selectedLocation);

  const getCurrentEntities = (): { entities: Entity[]; type: EntityType } => {
    switch (activeTab) {
      case "hubs":
        return { entities: filteredHubs, type: "hub" };
      case "communities":
        return { entities: filteredCommunities, type: "community" };
      case "startups":
        return { entities: filteredStartups, type: "startup" };
      default:
        return { entities: [], type: "hub" };
    }
  };

  const getUniqueLocations = () => {
    return ALL_DISTRICTS;
  };

  const handleSubmissionFormChange = (field: string, value: string) => {
    setSubmissionForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmissionSubmit = async () => {
    if (!submissionForm.name || !submissionForm.description || !submissionForm.location || !submissionForm.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const baseData = {
        name: submissionForm.name,
        description: submissionForm.description,
        location: submissionForm.location,
        email: submissionForm.email,
        website: submissionForm.website || undefined,
        phone: submissionForm.phone || undefined,
      };

      console.log('Submitting:', showSubmissionModal, baseData);

      let result;
      if (showSubmissionModal === 'hub') {
        result = await createHubMutation.mutateAsync(baseData);
        console.log('Hub created:', result);
      } else if (showSubmissionModal === 'community') {
        result = await createCommunityMutation.mutateAsync(baseData);
        console.log('Community created:', result);
      } else if (showSubmissionModal === 'startup') {
        result = await createStartupMutation.mutateAsync(baseData);
        console.log('Startup created:', result);
      }

      // Reset form and close modal
      setSubmissionForm({
        name: '',
        description: '',
        location: '',
        website: '',
        email: '',
        phone: '',
      });
      setShowSubmissionModal(null);
      
      // Refetch data to show the new submission immediately
      refetchHubs();
      refetchCommunities();
      refetchStartups();
      
      // Show success toast
      toast.success(
        `${showSubmissionModal?.charAt(0).toUpperCase()}${showSubmissionModal?.slice(1)} submitted successfully!`,
        {
          description: "Your submission is now live on the platform. Moderators will review and remove any inappropriate content.",
          duration: 5000,
          action: {
            label: "View",
            onClick: () => {
              // Scroll to the relevant tab
              setActiveTab(showSubmissionModal === 'hub' ? 'hubs' : showSubmissionModal === 'community' ? 'communities' : 'startups');
            }
          }
        }
      );
      
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit', {
        description: error instanceof Error ? error.message : 'Please try again later.',
        duration: 4000
      });
    }
  };

  const initializeMap = (map: google.maps.Map) => {
    mapRef.current = map;
    geocoderRef.current = new window.google.maps.Geocoder();
    
    // Center on Uganda
    map.setCenter({ lat: 0.3476, lng: 32.5825 });
    map.setZoom(7);
    
    updateMapMarkers();
  };

  const updateMapMarkers = async () => {
    if (!mapRef.current || !geocoderRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.map = null);
    markersRef.current = [];

    const { entities, type } = getCurrentEntities();
    const bounds = new window.google.maps.LatLngBounds();
    let markersAdded = 0;

    for (const entity of entities) {
      const locationStr = entity.address || entity.location;
      if (!locationStr) continue;

      try {
        const result = await new Promise<google.maps.GeocoderResult | null>((resolve) => {
          geocoderRef.current!.geocode(
            { address: `${locationStr}, Uganda` },
            (results, status) => {
              if (status === "OK" && results && results[0]) {
                resolve(results[0]);
              } else {
                resolve(null);
              }
            }
          );
        });

        if (!result) continue;

        const position = result.geometry.location;
        bounds.extend(position);

        // Create custom marker content
        const markerContent = document.createElement("div");
        markerContent.className = "flex items-center justify-center w-10 h-10 rounded-full shadow-lg cursor-pointer";
        markerContent.style.backgroundColor = type === "hub" ? "#6366f1" : type === "community" ? "#8b5cf6" : "#ec4899";
        
        const icon = document.createElement("div");
        icon.innerHTML = type === "hub" 
          ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h10"/><path d="M7 12h10"/><path d="M7 17h10"/></svg>'
          : type === "community"
          ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
          : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
        markerContent.appendChild(icon);

        const marker = new window.google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current,
          position,
          content: markerContent,
          title: entity.name,
        });

        // Create info window
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; max-width: 250px;">
              <h3 style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">${entity.name}</h3>
              ${entity.verified ? '<span style="background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Verified</span>' : ''}
              <p style="color: #64748b; font-size: 14px; margin-top: 8px;">${entity.description || 'No description available'}</p>
              ${entity.location ? `<p style="color: #94a3b8; font-size: 12px; margin-top: 4px;">📍 ${entity.location}</p>` : ''}
              <a href="/ecosystem/${type}s/${entity.slug}" style="color: #6366f1; font-size: 14px; margin-top: 8px; display: inline-block;">View Details →</a>
            </div>
          `,
        });

        markerContent.addEventListener("click", () => {
          infoWindow.open(mapRef.current, marker);
        });

        markersRef.current.push(marker);
        markersAdded++;
      } catch (error) {
        console.warn(`Failed to geocode ${entity.name}:`, error);
      }
    }

    // Fit bounds if markers were added
    if (markersAdded > 0) {
      mapRef.current.fitBounds(bounds);
      // Prevent zooming in too much for single marker
      const listener = window.google.maps.event.addListener(mapRef.current, "idle", () => {
        if (mapRef.current!.getZoom()! > 15) {
          mapRef.current!.setZoom(15);
        }
        window.google.maps.event.removeListener(listener);
      });
    }
  };

  useEffect(() => {
    if (viewMode === "map") {
      updateMapMarkers();
    }
  }, [activeTab, searchQuery, selectedLocation, viewMode, hubs, communities, startups]);

  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType | null>(null);

  const renderEntityCard = (entity: Entity, index: number, type: EntityType) => {
    const colorClasses = {
      hub: {
        bg: 'from-blue-500/10 to-blue-600/10',
        border: 'border-blue-500/20',
        badge: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
        icon: 'text-blue-500'
      },
      community: {
        bg: 'from-purple-500/10 to-purple-600/10',
        border: 'border-purple-500/20',
        badge: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
        icon: 'text-purple-500'
      },
      startup: {
        bg: 'from-pink-500/10 to-pink-600/10',
        border: 'border-pink-500/20',
        badge: 'bg-pink-500/20 text-pink-600 dark:text-pink-400',
        icon: 'text-pink-500'
      }
    };

    const colors = colorClasses[type];
    const Icon = type === 'hub' ? Building2 : type === 'community' ? Users : Rocket;

    return (
      <motion.div
        key={entity.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
      >
        <Card 
          className={`h-full cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br ${colors.bg} border-2 ${colors.border} backdrop-blur-sm`}
          onClick={() => {
            setSelectedEntity(entity);
            setSelectedEntityType(type);
          }}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3 mb-2">
              <div className={`p-2 rounded-lg bg-white/50 dark:bg-black/20`}>
                <Icon className={`h-5 w-5 ${colors.icon}`} />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg line-clamp-2 mb-1">{entity.name}</CardTitle>
                {entity.verified && (
                  <Badge className={`${colors.badge} border-0 text-xs`}>
                    ✓ Verified
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {entity.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{entity.location}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      
      <div className="container py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6 mb-12"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground font-['Space_Grotesk'] mb-2">
                Ecosystem Map
              </h1>
              <p className="text-lg text-muted-foreground">
                Discover tech hubs, communities, and startups across Uganda
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                    <Plus className="h-4 w-4" />
                    Add Your Organization
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Choose Organization Type</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3 py-4">
                    <Button
                      variant="outline"
                      className="justify-start gap-3 h-auto p-4"
                      onClick={() => setShowSubmissionModal('hub')}
                    >
                      <Building2 className="h-5 w-5 text-blue-500" />
                      <div className="text-left">
                        <div className="font-medium">Tech Hub</div>
                        <div className="text-sm text-muted-foreground">Co-working spaces, incubators, accelerators</div>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start gap-3 h-auto p-4"
                      onClick={() => setShowSubmissionModal('community')}
                    >
                      <Users className="h-5 w-5 text-purple-500" />
                      <div className="text-left">
                        <div className="font-medium">Community</div>
                        <div className="text-sm text-muted-foreground">Developer groups, meetups, organizations</div>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start gap-3 h-auto p-4"
                      onClick={() => setShowSubmissionModal('startup')}
                    >
                      <Rocket className="h-5 w-5 text-pink-500" />
                      <div className="text-left">
                        <div className="font-medium">Startup</div>
                        <div className="text-sm text-muted-foreground">Tech companies, startups, businesses</div>
                      </div>
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, location, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2">
                <Select value={selectedLocation || undefined} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Districts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Districts</SelectItem>
                    {ALL_DISTRICTS.map(district => (
                      <SelectItem key={district} value={district}>{district}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedLocation && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedLocation("")}
                    className="px-2"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex border rounded-md overflow-hidden">
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-none"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "map" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("map")}
                  className="rounded-none"
                >
                  <MapIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="hubs" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Hubs ({filteredHubs.length})
            </TabsTrigger>
            <TabsTrigger value="communities" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Communities ({filteredCommunities.length})
            </TabsTrigger>
            <TabsTrigger value="startups" className="flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              Startups ({filteredStartups.length})
            </TabsTrigger>
          </TabsList>

          {/* Map View */}
          {viewMode === "map" && (
            <div className="mt-8">
              <Card>
                <CardContent className="p-0">
                  <MapView
                    className="w-full h-[600px] rounded-lg"
                    onMapReady={initializeMap}
                  />
                </CardContent>
              </Card>
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Click on markers to view details. Showing {getCurrentEntities().entities.length} {activeTab}.
              </p>
            </div>
          )}

          {/* List View */}
          {viewMode === "list" && (
            <>
              {/* Hubs Tab */}
              <TabsContent value="hubs" className="mt-8">
                {hubsLoading ? (
                  <div className="text-center py-12">Loading hubs...</div>
                ) : filteredHubs.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No hubs found matching your search.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {filteredHubs.map((hub, index) => renderEntityCard(hub, index, "hub"))}
                  </div>
                )}
              </TabsContent>

              {/* Communities Tab */}
              <TabsContent value="communities" className="mt-8">
                {communitiesLoading ? (
                  <div className="text-center py-12">Loading communities...</div>
                ) : filteredCommunities.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No communities found matching your search.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {filteredCommunities.map((community, index) => renderEntityCard(community, index, "community"))}
                  </div>
                )}
              </TabsContent>

              {/* Startups Tab */}
              <TabsContent value="startups" className="mt-8">
                {startupsLoading ? (
                  <div className="text-center py-12">Loading startups...</div>
                ) : filteredStartups.length === 0 ? (
                  <div className="text-center py-12">
                    <Rocket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No startups found matching your search.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {filteredStartups.map((startup, index) => renderEntityCard(startup, index, "startup"))}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* Entity Detail Modal */}
        <Dialog open={!!selectedEntity} onOpenChange={() => setSelectedEntity(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedEntity && selectedEntityType && (
              <>
                <DialogHeader>
                  <div className="flex items-start gap-3">
                    {(() => {
                      const Icon = selectedEntityType === 'hub' ? Building2 : selectedEntityType === 'community' ? Users : Rocket;
                      const colorClass = selectedEntityType === 'hub' ? 'text-blue-500 bg-blue-500/10' : 
                                        selectedEntityType === 'community' ? 'text-purple-500 bg-purple-500/10' : 
                                        'text-pink-500 bg-pink-500/10';
                      return (
                        <div className={`p-3 rounded-lg ${colorClass}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                      );
                    })()}
                    <div className="flex-1">
                      <DialogTitle className="text-2xl mb-2">{selectedEntity.name}</DialogTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedEntity.verified && (
                          <Badge className={`${
                            selectedEntityType === 'hub' ? 'bg-blue-500/20 text-blue-600' :
                            selectedEntityType === 'community' ? 'bg-purple-500/20 text-purple-600' :
                            'bg-pink-500/20 text-pink-600'
                          } border-0`}>
                            ✓ Verified
                          </Badge>
                        )}
                        {selectedEntity.type && (
                          <Badge variant="outline">{selectedEntity.type}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  {/* Location */}
                  {(selectedEntity.location || selectedEntity.address) && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location
                      </h4>
                      <p className="text-muted-foreground">
                        {selectedEntity.address || selectedEntity.location}
                      </p>
                    </div>
                  )}
                  
                  {/* Description */}
                  {selectedEntity.description && (
                    <div>
                      <h4 className="font-semibold mb-2">About</h4>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {selectedEntity.description}
                      </p>
                    </div>
                  )}
                  
                  {/* Focus Areas */}
                  {selectedEntity.focusAreas && selectedEntity.focusAreas.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Focus Areas</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedEntity.focusAreas.map((area: string) => (
                          <Badge key={area} variant="secondary">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Contact Information */}
                  {(selectedEntity.email || selectedEntity.phone || selectedEntity.website) && (
                    <div>
                      <h4 className="font-semibold mb-3">Contact Information</h4>
                      <div className="space-y-2">
                        {selectedEntity.website && (
                          <a 
                            href={selectedEntity.website.startsWith('http') ? selectedEntity.website : `https://${selectedEntity.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                            <span className="truncate">{selectedEntity.website}</span>
                          </a>
                        )}
                        {selectedEntity.email && (
                          <a 
                            href={`mailto:${selectedEntity.email}`}
                            className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="truncate">{selectedEntity.email}</span>
                          </a>
                        )}
                        {selectedEntity.phone && (
                          <a 
                            href={`tel:${selectedEntity.phone}`}
                            className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>{selectedEntity.phone}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Social Links */}
                  {(selectedEntity.twitter || selectedEntity.linkedin || selectedEntity.slack || selectedEntity.discord || selectedEntity.telegram) && (
                    <div>
                      <h4 className="font-semibold mb-3">Social & Community</h4>
                      <div className="space-y-2">
                        {selectedEntity.twitter && (
                          <a 
                            href={selectedEntity.twitter.startsWith('http') ? selectedEntity.twitter : `https://twitter.com/${selectedEntity.twitter.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            <span>Twitter/X</span>
                          </a>
                        )}
                        {selectedEntity.linkedin && (
                          <a 
                            href={selectedEntity.linkedin.startsWith('http') ? selectedEntity.linkedin : `https://linkedin.com/company/${selectedEntity.linkedin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                            <span>LinkedIn</span>
                          </a>
                        )}
                        {selectedEntity.slack && (
                          <a 
                            href={selectedEntity.slack}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                            </svg>
                            <span>Slack</span>
                          </a>
                        )}
                        {selectedEntity.discord && (
                          <a 
                            href={selectedEntity.discord}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                            </svg>
                            <span>Discord</span>
                          </a>
                        )}
                        {selectedEntity.telegram && (
                          <a 
                            href={selectedEntity.telegram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12a12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472c-.18 1.898-.962 6.502-1.36 8.627c-.168.9-.499 1.201-.82 1.23c-.696.065-1.225-.46-1.9-.902c-1.056-.693-1.653-1.124-2.678-1.8c-1.185-.78-.417-1.21.258-1.91c.177-.184 3.247-2.977 3.307-3.23c.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345c-.48.33-.913.49-1.302.48c-.428-.008-1.252-.241-1.865-.44c-.752-.245-1.349-.374-1.297-.789c.027-.216.325-.437.893-.663c3.498-1.524 5.83-2.529 6.998-3.014c3.332-1.386 4.025-1.627 4.476-1.635z"/>
                            </svg>
                            <span>Telegram</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Additional Details */}
                  <div className="grid grid-cols-2 gap-4">
                    {selectedEntity.type && (
                      <div>
                        <h4 className="font-semibold mb-1 text-sm">Type</h4>
                        <Badge variant="outline" className="text-sm">
                          {selectedEntity.type}
                        </Badge>
                      </div>
                    )}
                    
                    {selectedEntity.memberCount && (
                      <div>
                        <h4 className="font-semibold mb-1 text-sm flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Members
                        </h4>
                        <p className="text-muted-foreground text-sm">
                          {selectedEntity.memberCount.toLocaleString()}
                        </p>
                      </div>
                    )}
                    
                    {selectedEntity.stage && (
                      <div>
                        <h4 className="font-semibold mb-1 text-sm">Stage</h4>
                        <Badge variant="outline" className="text-sm">
                          {selectedEntity.stage}
                        </Badge>
                      </div>
                    )}
                    
                    {selectedEntity.industry && (
                      <div>
                        <h4 className="font-semibold mb-1 text-sm">Industry</h4>
                        <p className="text-muted-foreground text-sm">{selectedEntity.industry}</p>
                      </div>
                    )}
                    
                    {selectedEntity.founded && (
                      <div>
                        <h4 className="font-semibold mb-1 text-sm">Founded</h4>
                        <p className="text-muted-foreground text-sm">{selectedEntity.founded}</p>
                      </div>
                    )}
                    
                    {selectedEntity.teamSize && (
                      <div>
                        <h4 className="font-semibold mb-1 text-sm">Team Size</h4>
                        <p className="text-muted-foreground text-sm">{selectedEntity.teamSize} people</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Submission Modals */}
        <Dialog open={!!showSubmissionModal} onOpenChange={() => setShowSubmissionModal(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {showSubmissionModal === 'hub' && <Building2 className="h-5 w-5 text-blue-500" />}
                {showSubmissionModal === 'community' && <Users className="h-5 w-5 text-purple-500" />}
                {showSubmissionModal === 'startup' && <Rocket className="h-5 w-5 text-pink-500" />}
                Add {showSubmissionModal === 'hub' ? 'Tech Hub' : showSubmissionModal === 'community' ? 'Community' : 'Startup'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={submissionForm.name}
                  onChange={(e) => handleSubmissionFormChange('name', e.target.value)}
                  placeholder={`Enter ${showSubmissionModal} name`}
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={submissionForm.description}
                  onChange={(e) => handleSubmissionFormChange('description', e.target.value)}
                  placeholder="Describe what you do, your mission, or services offered"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="location">Location *</Label>
                <Select value={submissionForm.location} onValueChange={(value) => handleSubmissionFormChange('location', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select district..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_DISTRICTS.map((district) => (
                      <SelectItem key={district} value={district}>
                        {district}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={submissionForm.website}
                  onChange={(e) => handleSubmissionFormChange('website', e.target.value)}
                  placeholder="https://yourwebsite.com"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={submissionForm.email}
                  onChange={(e) => handleSubmissionFormChange('email', e.target.value)}
                  placeholder="contact@yourorganization.com"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={submissionForm.phone}
                  onChange={(e) => handleSubmissionFormChange('phone', e.target.value)}
                  placeholder="+256 XXX XXX XXX"
                />
              </div>

              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-sm text-green-700 dark:text-green-300">
                  <strong>Submission Review:</strong> Your submission will be reviewed by moderators before it appears on the platform.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleSubmissionSubmit}
                  disabled={!submissionForm.name || !submissionForm.description || !submissionForm.location || !submissionForm.email || createHubMutation.isPending || createCommunityMutation.isPending || createStartupMutation.isPending}
                  className="flex-1"
                >
                  {(createHubMutation.isPending || createCommunityMutation.isPending || createStartupMutation.isPending) ? 'Submitting...' : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Submit for Review
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowSubmissionModal(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
