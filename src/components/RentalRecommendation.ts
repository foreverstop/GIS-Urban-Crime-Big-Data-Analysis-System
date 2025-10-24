import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import listings from '@/assets/listings.json';
import type { Marker } from 'leaflet';

export function useRentalRecommendation(onDetailRequest: (id: number) => void) {
    const authStore = useAuthStore()
    const router = useRouter()
    const SecurityExpanded = ref(true);
    const SelectExpanded = ref(true);
    const RentingExpanded = ref(true);
    const DecisionExpanded = ref(true);
    const map = ref<L.Map | null>(null);
    const mapContainer = ref<HTMLElement | null>(null);
    const initialMapView = ref<{ center: L.LatLngExpression; zoom: number } | null>(null); // 存储初始地图视图
    const mapMarkers: Marker[] = [];
    let scoreMarkers: Marker[] = [];  // 存储安全评分标记

    const filterModalVisible = ref(false);
    const priceMin = ref<number | null>(null);
    const priceMax = ref<number | null>(null);
    const ratingMin = ref<number>(4.6);          // 默认 4.6
    const stayMin = ref<number | null>(null);   // minimum_nights
    const stayMax = ref<number | null>(null);   // maximum_nights

    interface UserInfo {
        account: string
        email: string
    }

    const userInfo = ref<UserInfo>({
        account: '加载中...',
        email: ''
    })

    const handleLogout = async () => {
        try {
            await authStore.logout()
            router.push({ name: 'login' })
        } catch (error) {
            console.error('登出失败:', error)
        }
    }

    const fetchUserInfo = async () => {
        try {
            const info = await authStore.getUserInfo()
            console.log('用户数据:', info)
            userInfo.value = {
                account: info.account,
                email: info.email
            }
        } catch (error) {
            console.error('获取用户信息失败:', error)
            router.push({ name: 'login' })
        }
    }

    const toggleSecurity = () => {
        SecurityExpanded.value = !SecurityExpanded.value;
    };

    const toggleSelect = () => {
        SelectExpanded.value = !SelectExpanded.value;
    };

    const toggleDecision = () => {
        DecisionExpanded.value = !DecisionExpanded.value;
    }

    const toggleRenting = () => {
        RentingExpanded.value = !RentingExpanded.value;
    }

    function loadRentMarkers() {
        if (!map.value) return;
        // Check if markers already exist to avoid duplication when function is called multiple times
        if (mapMarkers.length) return;

        (listings as any[]).forEach((row: any) => {
            const lat = +row.latitude, lng = +row.longitude;
            if (!lat || !lng) return;

            const popup = `
          <div style="width:230px">
            <img src="${row.picture_url}" style="width:100%;border-radius:4px;margin-bottom:4px">
            <strong>${row.name}</strong><br/>
            价格: ${row.price || 'N/A'}<br/>
            房东: ${row.host_name || 'N/A'}<br/>
            创立时间: ${row.host_since?.split('T')[0] || ''}<br/>
            评分: ${row.review_scores_rating || 'N/A'}<br/>
          </div>`;

            // Changed colors for rental markers to fit digital theme
            const m = L.circleMarker([lat, lng], {
                radius: 5, // Slightly larger radius for better visibility
                fillColor: 'rgba(0, 255, 255, 0.8)', // Bright Cyan, semi-transparent
                color: '#00FFFF', // Bright Cyan border
                weight: 1, // Border thickness
                opacity: 1, // Border opacity
                fillOpacity: 0.9 // Fill opacity
            })
                .bindPopup(popup)
                .addTo(map.value!);

            mapMarkers.push(m as unknown as Marker);
        });
    }

    function clearMarkers() {
        mapMarkers.forEach(m => m.remove());
        mapMarkers.length = 0;
    }

    function matchFilters(row: any) {
        const price = +row.price;
        const reviewScore = +row.review_scores_value;
        const minNights = +row.minimum_nights;
        const maxNights = +row.maximum_nights;

        if (priceMin.value !== null && price < priceMin.value) return false;
        if (priceMax.value !== null && price > priceMax.value) return false;
        if (reviewScore < ratingMin.value) return false;
        if (stayMin.value !== null && minNights < stayMin.value) return false;
        if (stayMax.value !== null && maxNights > stayMax.value) return false;

        return true;
    }

    function applyFilters() {
        if (!map.value) return;

        clearMarkers();

        (listings as any[]).forEach((row: any) => {
            if (!matchFilters(row)) return;

            const lat = +row.latitude, lng = +row.longitude;
            if (!lat || !lng) return;

            const popup = `
          <div style="width:230px">
            <img src="${row.picture_url}" style="width:100%;border-radius:4px;margin-bottom:4px">
            <strong>${row.name}</strong><br/>
            价格: ${row.price || 'N/A'}<br/>
            房东: ${row.host_name || 'N/A'}<br/>
            创立时间: ${row.host_since?.split('T')[0] || ''}<br/>
            评分: ${row.review_scores_rating || 'N/A'}<br/>
          </div>`;

            // Consistent styling for filtered markers
            const m = L.circleMarker([lat, lng], {
                radius: 5,
                fillColor: 'rgba(0, 255, 255, 0.8)',
                color: '#00FFFF',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.9
            }).bindPopup(popup).addTo(map.value);

            mapMarkers.push(m as unknown as Marker);
        });

        filterModalVisible.value = false;   // 关闭弹窗
    }

    function resetFilterInputs() {
        priceMin.value = null;
        priceMax.value = null;
        ratingMin.value = 0;     // 恢复默认
        stayMin.value = null;
        stayMax.value = null;
    }

    function clearRentalLayer() {
        clearMarkers();            // 复用之前写好的清空函数
    }

    function clearScoreLayer() {
        scoreMarkers.forEach(m => m.remove());
        scoreMarkers.length = 0;  // 清空标记数组
    }

    function loadSafetyScoreMarkers(
        rows: any[],
    ) {
        // 1. 清除上一次的标记
        scoreMarkers.forEach(m => m.remove())
        scoreMarkers = []

        // Modified colors for safety score categories to fit digital theme
        function getColor(score: number): string {
            if (score < 10) return 'rgba(0, 255, 255, 0.7)'; // Cyan for Safe
            else if (score < 30) return 'rgba(0, 123, 255, 0.7)'; // Blue for Medium
            else if (score < 80) return 'rgba(255, 69, 0, 0.7)'; // Orange-Red for Dangerous
            else return 'rgba(160, 176, 208, 0.7)'; // Light Gray for Very Dangerous
        }

        // 2. 遍历数据，逐条绘制
        rows.forEach(row => {

            const lat = Number(row.latitude)
            const lng = Number(row.longitude)
            const score = Number(row.safety_score)
            if (!lat || !lng) return

            const listingId = row.id
            const linkId = `detail-link-${listingId}`

            // 3. 弹窗 HTML，保留原有信息和样式
            const popupHtml = `
          <div style="width:230px">
            <img src="${row.picture_url}"
                  style="width:100%;border-radius:4px;margin-bottom:4px">
            <strong>${row.name}</strong><br/>
            价格: ${row.price ?? 'N/A'}<br/>
            房东: ${row.host_name ?? 'N/A'}<br/>
            评分: ${row.review_scores_rating ?? 'N/A'}<br/>
            危险系数：${row.safety_score?.toFixed(2) ?? 'N/A'}<br/>
            <a href="javascript:void(0)" id="${linkId}"
                  style="color: #00FFFF; text-decoration: underline;">
              查看更多
            </a>
          </div>
        `

            // 4. 创建带动态配色的 CircleMarker
            const color = getColor(score)
            const marker = L.circleMarker([lat, lng], {
                radius: 5, // Slightly larger radius for better visibility
                fillColor: color,
                color: '#00FFFF', // Border color for safety score markers, consistent digital theme
                weight: 1,
                opacity: 1,
                fillOpacity: 0.7
            })
                .bindPopup(popupHtml)
                .addTo(map.value!)
                .on('popupopen', () => {
                    const linkEl = document.getElementById(linkId)
                    if (!linkEl) return
                    linkEl.addEventListener('click', e => {
                        e.preventDefault()
                        onDetailRequest(listingId)
                    })
                })

            // 6. 保存标记
            scoreMarkers.push(marker)
        })
    }

    onMounted(() => {
        fetchUserInfo()

        if (mapContainer.value) {
            map.value = L.map(mapContainer.value).setView([38.9072, -77.0369], 12) as L.Map;

            // 存储初始地图视图
            initialMapView.value = {
                center: map.value.getCenter(),
                zoom: map.value.getZoom()
            };

            // Use Stadia Maps Alidade Smooth Dark tile layer
            L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                minZoom: 0,
                maxZoom: 20
            }).addTo(map.value);


            L.control.scale({ imperial: false }).addTo(map.value);
        }
    })

    return {
        userInfo,
        SelectExpanded,
        SecurityExpanded,
        RentingExpanded,
        DecisionExpanded,
        mapContainer,
        filterModalVisible,
        priceMin,
        priceMax,
        ratingMin,
        stayMin,
        stayMax,

        handleLogout,
        toggleSelect,
        toggleSecurity,
        toggleDecision,
        toggleRenting,
        loadRentMarkers,
        applyFilters,
        clearMarkers,
        resetFilterInputs,
        clearRentalLayer,
        loadSafetyScoreMarkers,
        clearScoreLayer,

    }
}