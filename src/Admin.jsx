import { useState, useEffect, useMemo } from "react";
import { db } from "./firebase";
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    deleteDoc,
    onSnapshot,
} from "firebase/firestore";

const DEFAULT_VOLUNTEER_GUIDE = `기본 사용 방법
오늘 배달할 동을 눌러 주세요.
주소와 도시락 수량을 확인한 뒤 배달해 주세요.
배달을 마치면 완료 표시를 눌러 주세요.
배달 중 문제가 있으면 경고 표시를 눌러 주세요.
잘못 눌렀거나 수정이 필요하면 관리자에게 알려 주세요.

버튼 안내
□ 네모 박스: 배달 완료시 눌러 주세요. 체크 표시가 됩니다.
⚠️ 노란색 경고: 배달 중 문제가 생겼을 때 눌러 주세요.
📝 메모: 문제 내용은 동별 메모창에 남겨 주세요. 담당자가 즉시 확인할 수 있습니다.`;

function Admin() {

    const [notice, setNotice] = useState("");
    const [volunteerGuide, setVolunteerGuide] = useState(DEFAULT_VOLUNTEER_GUIDE);
    const [buildingNotice, setBuildingNotice] = useState("");
    const [selectedBuilding, setSelectedBuilding] = useState("409");
    const [buildingData, setBuildingData] = useState(null);
    const [editData, setEditData] = useState(null);
    const [newRoom, setNewRoom] = useState("");
    const [newBuilding, setNewBuilding] = useState("");
    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [adminPassword, setAdminPassword] = useState("1234");
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [tab, setTab] = useState("dashboard");
    const [dashboardData, setDashboardData] = useState([]);
    const [buildings, setBuildings] = useState([]);
    const [hiddenBuildings, setHiddenBuildings] = useState([]);
    const [isDirty, setIsDirty] = useState(false);
    const [expandedIssues, setExpandedIssues] = useState(null);
    const [liveViewMode, setLiveViewMode] = useState("expanded");
    const [dashboardSectionsOpen, setDashboardSectionsOpen] = useState({
        status: true,
        notice: false,
        guide: false,
        password: false,
    });

    function toggleDashboardSection(section) {
        setDashboardSectionsOpen((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    }

    function renderDashboardSectionTitle(section, title, level = 3) {
        const isOpen = dashboardSectionsOpen[section];

        return (
            <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggleDashboardSection(section)}
                style={{
                    width: "100%",
                    minHeight: level === 2 ? "52px" : "46px",
                    marginTop: level === 2 ? 0 : "16px",
                    marginBottom: "10px",
                    padding: "0 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    backgroundColor: "#f9fafb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    fontSize: level === 2 ? "24px" : "20px",
                    fontWeight: "bold",
                    color: "#111827",
                    boxSizing: "border-box",
                }}
            >
                <span>{title}</span>
                <span aria-hidden="true">
                    {isOpen ? "▲" : "▼"}
                </span>
            </button>
        );
    }

    function isRoomPaused(room) {
        return room.paused === true;
    }

    function normalizeRoom(room) {
        return {
            checked: false,
            ...room,
            paused: room.paused === true,
        };
    }

    function getEffectiveMealCounts(building) {
        const rooms = building.rooms || [];
        const pausedRooms = rooms.filter(
            isRoomPaused
        );

        return {
            lunch: Math.max(
                (building.lunch || 0) - pausedRooms.length,
                0
            ),
            soup: Math.max(
                (building.soup || 0) -
                pausedRooms.filter(
                    (room) => !room.soupExcluded
                ).length,
                0
            ),
            lohas: Math.max(
                (building.lohas || 0) -
                pausedRooms.filter(
                    (room) => !room.lohasExcluded
                ).length,
                0
            ),
        };
    }

    const dashboardSourceData = useMemo(() => {
        if (!selectedBuilding || !editData) {
            return dashboardData;
        }

        const editedBuilding = {
            ...editData,
            id: selectedBuilding,
            notice: buildingNotice,
            deliveryMemo:
                buildingData?.deliveryMemo ||
                editData.deliveryMemo ||
                "",
        };

        if (
            !dashboardData.some(
                (building) => building.id === selectedBuilding
            )
        ) {
            return [...dashboardData, editedBuilding];
        }

        return dashboardData.map((building) =>
            building.id === selectedBuilding
                ? {
                    ...building,
                    ...editedBuilding,
                }
                : building
        );
    }, [
        buildingData?.deliveryMemo,
        buildingNotice,
        dashboardData,
        editData,
        selectedBuilding,
    ]);

    const issueRooms = dashboardSourceData.reduce(
        (acc, building) => {
            acc[building.id] =
                (building.rooms || [])
                    .filter(room => room.issue && !isRoomPaused(room));

            return acc;
        },
        {}
    );

    const visibleDashboardSourceData = useMemo(
        () =>
            dashboardSourceData.filter(
                (building) =>
                    !hiddenBuildings.includes(building.id)
            ),
        [dashboardSourceData, hiddenBuildings]
    );





    async function saveNotice() {
        await setDoc(
            doc(db, "notice", "all"),
            {
                message: notice,
            }
        );

        alert("공지 저장 완료!");
    }
    async function saveVolunteerGuide() {
        await setDoc(
            doc(db, "settings", "volunteerGuide"),
            {
                content: volunteerGuide,
            }
        );

        alert("사용 안내 저장 완료!");
    }
    useEffect(() => {
        async function loadNotice() {
            const docRef = doc(db, "notice", "all");
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setNotice(docSnap.data().message);
            }
        }

        loadNotice();
    }, []);
    useEffect(() => {
        async function loadVolunteerGuide() {
            const docSnap = await getDoc(
                doc(db, "settings", "volunteerGuide")
            );

            if (docSnap.exists()) {
                setVolunteerGuide(
                    docSnap.data().content || DEFAULT_VOLUNTEER_GUIDE
                );
            }
        }

        loadVolunteerGuide();
    }, []);
    useEffect(() => {
        async function loadPassword() {

            const docSnap = await getDoc(
                doc(db, "settings", "admin")
            );

            if (docSnap.exists()) {
                setAdminPassword(
                    docSnap.data().password
                );
            }
        }

        loadPassword();
    }, []);
    useEffect(() => {

        async function loadBuildings() {

            const docSnap = await getDoc(
                doc(db, "settings", "buildings")
            );

            if (docSnap.exists()) {

                setBuildings(
                    docSnap.data().list || []
                );

            } else {

                await setDoc(
                    doc(db, "settings", "buildings"),
                    {
                        list: [
                            "401",
                            "402",
                            "403",
                            "404",
                            "405",
                            "406",
                            "407",
                            "408",
                            "409",
                        ],
                    }
                );

                setBuildings([
                    "401",
                    "402",
                    "403",
                    "404",
                    "405",
                    "406",
                    "407",
                    "408",
                    "409",
                ]);
            }
        }

        loadBuildings();

    }, []);
    useEffect(() => {

        async function loadHiddenBuildings() {

            const docSnap = await getDoc(
                doc(db, "settings", "buildingHidden")
            );

            if (docSnap.exists()) {

                setHiddenBuildings(
                    docSnap.data().hidden || []
                );
            }
        }

        loadHiddenBuildings();

    }, []);

    useEffect(() => {

        const unsubscribe = onSnapshot(
            collection(db, "buildings"),
            (snapshot) => {

                const result = [];

                snapshot.forEach((doc) => {
                    result.push({
                        id: doc.id,
                        ...doc.data(),
                    });
                });

                setDashboardData(result);
            }
        );

        return () => unsubscribe();

    }, []);

    const totalLunch = visibleDashboardSourceData.reduce(
        (sum, building) =>
            sum + getEffectiveMealCounts(building).lunch,
        0
    );

    const totalSoup = visibleDashboardSourceData.reduce(
        (sum, building) =>
            sum + getEffectiveMealCounts(building).soup,
        0
    );

    const totalLohas = visibleDashboardSourceData.reduce(
        (sum, building) =>
            sum + getEffectiveMealCounts(building).lohas,
        0
    );

    const buildingStatus = visibleDashboardSourceData.map(
        (building) => {
            const activeRooms = (building.rooms || []).filter(
                (room) => !isRoomPaused(room)
            );
            const liveBuilding = dashboardData.find(
                (item) => item.id === building.id
            );
            const liveRooms = liveBuilding?.rooms || [];
            const effectiveMealCounts = getEffectiveMealCounts(building);

            return {
                id: building.id,
                checked:
                    activeRooms.filter(
                        (room) => {
                            const liveRoom = liveRooms.find(
                                (item) => item.id === room.id
                            );

                            return liveRoom
                                ? liveRoom.checked
                                : room.checked;
                        }
                    ).length,
                total:
                    effectiveMealCounts.lunch,

                issues:
                    activeRooms.filter(
                        (room) => room.issue
                    ).length,
                hasDeliveryMemo:
                    Boolean((building.deliveryMemo || "").trim()),
            };
        }
    );

    const totalCheckedRooms = buildingStatus.reduce(
        (sum, building) => sum + building.checked,
        0
    );

    const totalActiveRooms = buildingStatus.reduce(
        (sum, building) => sum + building.total,
        0
    );

    const visibleBuildingStatus = buildingStatus
        .sort((a, b) => a.id.localeCompare(b.id, "ko"));

    const visibleDashboardBuildings = visibleDashboardSourceData
        .sort((a, b) => a.id.localeCompare(b.id, "ko"));

    const totalIssueRooms = visibleBuildingStatus.reduce(
        (sum, building) => sum + building.issues,
        0
    );

    const totalPendingRooms = Math.max(
        totalActiveRooms - totalCheckedRooms,
        0
    );

    const liveIssueList = visibleDashboardBuildings.flatMap(
        (building) =>
            (building.rooms || [])
                .filter((room) => room.issue && !isRoomPaused(room))
                .map((room) => ({
                    buildingId: building.id,
                    ...room,
                }))
    );

    function openBuilding(buildingId) {
        if (
            isDirty &&
            buildingId !== selectedBuilding &&
            !window.confirm(
                "??ν븯吏 ?딆? 蹂寃쎌궗??씠 ?덉뒿?덈떎.\n?숈쓣 蹂寃쏀븷源뚯슂?"
            )
        ) {
            return;
        }

        window.history.pushState(
            {
                tab: "building",
                building: buildingId,
            },
            ""
        );

        if (buildingId !== selectedBuilding) {
            setIsDirty(false);
            setEditData(null);
            setBuildingData(null);
            setBuildingNotice("");
        }

        setSelectedBuilding(buildingId);
        setTab("building");
    }

    useEffect(() => {
        if (!expandedIssues) return;

        const expandedBuilding = dashboardSourceData.find(
            (building) => building.id === expandedIssues
        );

        const hasIssues = expandedBuilding?.rooms?.some(
            (room) => room.issue
        );

        if (!hasIssues) {
            setExpandedIssues(null);
        }
    }, [dashboardSourceData, expandedIssues]);

    function syncMealCountsWithRooms(data, nextRooms) {
        const prevRooms = data.rooms || [];
        const previousCount = prevRooms.length;
        const nextCount = nextRooms.length;
        const nextLunch = Math.max(
            data.lunch === previousCount
                ? nextCount
                : (data.lunch ?? nextCount),
            nextCount
        );

        return {
            ...data,
            lunch: nextLunch,
            soup:
                data.soup === previousCount
                    ? nextCount
                    : (data.soup ?? nextCount),
            lohas:
                data.lohas === previousCount
                    ? nextCount
                    : (data.lohas ?? nextCount),
            rooms: nextRooms,
        };
    }

    async function saveBuilding() {

        const sortedRooms = [...editData.rooms].sort(
            (a, b) =>
                parseInt(a.room) - parseInt(b.room)
        ).map(normalizeRoom);
        const nextData = syncMealCountsWithRooms(
            editData,
            sortedRooms
        );

        await setDoc(
            doc(db, "buildings", selectedBuilding),
            {
                ...nextData,
                notice: buildingNotice,
                deliveryMemo: buildingData?.deliveryMemo || "",
            }
        );

        setEditData(nextData);
        setBuildingData({
            ...nextData,
            deliveryMemo: buildingData?.deliveryMemo || "",
        });

        setIsDirty(false);
        alert("동 정보 저장 완료!");
    }
    async function resetChecks() {
        const rooms = editData.rooms.map((room) => ({
            ...room,
            checked: false,
            issue: false,
        }));

        await updateDoc(
            doc(db, "buildings", selectedBuilding),
            { rooms }
        );

        alert("체크 초기화 완료!");
    }
    async function resetAllDeliveryStatus() {

        if (!window.confirm("전체 동의 체크, 문제 표시, 배달 특이사항 메모를 초기화할까요?")) {
            return;
        }

        setExpandedIssues(null);

        for (const buildingId of buildings) {

            const docSnap = await getDoc(
                doc(db, "buildings", buildingId)
            );

            if (!docSnap.exists()) continue;

            const data = docSnap.data();

            const rooms = (data.rooms || []).map(
                (room) => ({
                    ...room,
                    checked: false,
                    issue: false,
                    paused: false,
                })
            );

            await updateDoc(
                doc(db, "buildings", buildingId),
                {
                    rooms,
                    deliveryMemo: "",
                }
            );
        }

        alert("전체 배달 현황 초기화 완료!");
    }
    function addRoom() {
        if (!newRoom.trim()) return;

        const roomName =
            newRoom.endsWith("호")
                ? newRoom
                : `${newRoom}호`;

        const newItem = {
            id: Date.now(),
            room: roomName,
            memo: "",
            soupExcluded: false,
            lohasExcluded: false,
            specialRequest: "",
            checked: false,
            paused: false,
        };


        setEditData(
            syncMealCountsWithRooms(
                editData,
                [...editData.rooms, newItem]
            )
        );
        setIsDirty(true);

        setNewRoom("");
    }
    function deleteRoom(roomId) {
        setEditData(
            syncMealCountsWithRooms(
                editData,
                editData.rooms.filter(
                    (room) => room.id !== roomId
                )
            )
        );
        setIsDirty(true);
    }
    async function addBuilding() {

        if (!newBuilding.trim()) return;

        if (
            buildings.includes(
                newBuilding.trim()
            )
        ) {
            alert("이미 존재하는 동입니다.");
            return;
        }

        const updatedBuildings = [
            ...buildings,
            newBuilding,
        ].sort();

        await setDoc(
            doc(db, "settings", "buildings"),
            {
                list: updatedBuildings,
            }
        );
        await setDoc(
            doc(db, "buildings", newBuilding),
            {
                lunch: 0,
                soup: 0,
                lohas: 0,
                rooms: [],
                notice: "",
                deliveryMemo: "",
            }
        );

        setBuildings(updatedBuildings);

        setEditData(null);
        setBuildingData(null);
        setBuildingNotice("");
        setSelectedBuilding(newBuilding);

        setNewBuilding("");

        alert("동 추가 완료!");
    }
    async function hideBuilding() {

        if (!selectedBuilding) return;

        if (
            !window.confirm(
                `${selectedBuilding}동을 숨길까요?`
            )
        ) {
            return;
        }

        const updatedHidden = [
            ...new Set([
                ...hiddenBuildings,
                selectedBuilding,
            ]),
        ];

        await setDoc(
            doc(db, "settings", "buildingHidden"),
            {
                hidden: updatedHidden,
            }
        );

        setHiddenBuildings(updatedHidden);

        alert(`${selectedBuilding}동 숨김 완료`);
    }
    async function restoreBuilding(buildingId) {

        const updatedHidden =
            hiddenBuildings.filter(
                (id) => id !== buildingId
            );

        await setDoc(
            doc(db, "settings", "buildingHidden"),
            {
                hidden: updatedHidden,
            }
        );

        setHiddenBuildings(updatedHidden);

        alert(`${buildingId} 복구 완료`);
    }
    async function deleteBuilding(buildingId) {

        if (
            !window.confirm(
                `${buildingId}동을 완전히 삭제할까요?\n복구할 수 없습니다.`
            )
        ) {
            return;
        }

        await deleteDoc(
            doc(db, "buildings", buildingId)
        );

        const updatedBuildings =
            buildings.filter(
                (id) => id !== buildingId
            );

        const updatedHidden =
            hiddenBuildings.filter(
                (id) => id !== buildingId
            );

        await setDoc(
            doc(db, "settings", "buildings"),
            {
                list: updatedBuildings,
            }
        );

        await setDoc(
            doc(db, "settings", "buildingHidden"),
            {
                hidden: updatedHidden,
            }
        );

        setBuildings(updatedBuildings);
        setHiddenBuildings(updatedHidden);

        alert(`${buildingId} 삭제 완료`);
    }
    useEffect(() => {
        const docRef = doc(db, "buildings", selectedBuilding);

        const unsubscribe = onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {

                const data = docSnap.data();

                data.rooms = (data.rooms || []).map(normalizeRoom);
                const normalizedData = syncMealCountsWithRooms(
                    data,
                    data.rooms
                );

                setBuildingData(normalizedData);

                if (!isDirty) {
                    setBuildingNotice(normalizedData.notice || "");
                    setEditData(normalizedData);
                }

            } else {
                const emptyData = {
                    lunch: 0,
                    soup: 0,
                    lohas: 0,
                    rooms: [],
                    notice: "",
                    deliveryMemo: "",
                };

                await setDoc(docRef, emptyData);

                setBuildingData(emptyData);

                if (!isDirty) {
                    setBuildingNotice("");
                    setEditData(emptyData);
                }
            }
        });

        return () => unsubscribe();
    }, [selectedBuilding, isDirty]);

    useEffect(() => {

        window.history.replaceState(
            { tab: "dashboard" },
            ""
        );

        const handlePopState = (event) => {

            if (event.state?.tab) {

                setTab(event.state.tab);

                if (event.state.building) {
                    setSelectedBuilding(
                        event.state.building
                    );
                }
            }

        };

        window.addEventListener(
            "popstate",
            handlePopState
        );

        return () => {
            window.removeEventListener(
                "popstate",
                handlePopState
            );
        };

    }, []);

    function handleLogin() {
        if (password === adminPassword) {

            window.history.replaceState(
                { tab: "dashboard" },
                ""
            );

            setIsLoggedIn(true);
        } else {
            alert("비밀번호가 틀렸습니다.");
        }
    }

    if (!isLoggedIn) {
        return (
            <div
                style={{
                    maxWidth: "300px",
                    margin: "100px auto",
                    textAlign: "center",
                }}
            >
                <h2>관리자 로그인</h2>

                <input
                    type="password"
                    placeholder="비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            handleLogin();
                        }
                    }}
                    style={{
                        width: "100%",
                        height: "40px",
                        marginBottom: "10px",
                    }}
                />

                <button
                    onClick={handleLogin}
                    style={{
                        width: "100%",
                        height: "40px",
                    }}
                >
                    로그인
                </button>
            </div>
        );
    }
    return (
        <div
            style={{
                maxWidth: tab === "live" ? "980px" : "500px",
                margin: "0 auto",
                padding: "20px",
            }}
        >
            <h1>⚙ 관리자 페이지</h1>
            <div
                style={{
                    display: "flex",
                    gap: "10px",
                    marginBottom: "20px",
                }}
            >
                <button
                    onClick={() => {

                        if (
                            isDirty &&
                            !window.confirm(
                                "저장하지 않은 변경사항이 있습니다.\n이동할까요?"
                            )
                        ) {
                            return;
                        }

                        window.history.pushState(
                            { tab: "dashboard" },
                            ""
                        );

                        setTab("dashboard");
                    }}
                >
                    📊 전체 현황
                </button>

                <button
                    onClick={() => {

                        if (
                            isDirty &&
                            !window.confirm(
                                "저장하지 않은 변경사항이 있습니다.\n이동할까요?"
                            )
                        ) {
                            return;
                        }

                        window.history.pushState(
                            { tab: "live" },
                            ""
                        );

                        setTab("live");
                    }}
                >
                    🟢 실시간 현황판
                </button>

                <button
                    onClick={() => {

                        window.history.pushState(
                            {
                                tab: "building",
                                building: selectedBuilding,
                            },
                            ""
                        );

                        setTab("building");
                    }}
                >
                    🏢 동별 관리
                </button>

                <button
                    onClick={() => {

                        if (
                            isDirty &&
                            !window.confirm(
                                "저장하지 않은 변경사항이 있습니다.\n이동할까요?"
                            )
                        ) {
                            return;
                        }

                        window.history.pushState(
                            { tab: "hidden" },
                            ""
                        );

                        setTab("hidden");
                    }}
                >
                    👁 숨김 관리
                </button>
            </div>
            {tab === "live" && (
                <div>
                    <h2>실시간 현황판</h2>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                            gap: "10px",
                            marginBottom: "14px",
                        }}
                    >
                        {[
                            ["전체", totalActiveRooms],
                            ["완료", totalCheckedRooms],
                            ["대기", totalPendingRooms],
                            ["문제", totalIssueRooms],
                        ].map(([label, value]) => (
                            <div
                                key={label}
                                style={{
                                    minHeight: "74px",
                                    padding: "12px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "8px",
                                    boxSizing: "border-box",
                                    backgroundColor:
                                        label === "문제" && value > 0
                                            ? "#fff1f2"
                                            : "#ffffff",
                                }}
                            >
                                <div
                                    style={{
                                        color: "#6b7280",
                                        fontSize: "13px",
                                    }}
                                >
                                    {label}
                                </div>
                                <div
                                    style={{
                                        marginTop: "4px",
                                        color:
                                            label === "문제" && value > 0
                                                ? "#b91c1c"
                                                : "#111827",
                                        fontSize: "28px",
                                        fontWeight: "bold",
                                        fontVariantNumeric: "tabular-nums",
                                        lineHeight: 1,
                                    }}
                                >
                                    {value}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: "8px",
                            padding: "12px",
                            border: "1px solid #d1d5db",
                            borderRadius: "8px",
                            marginBottom: "14px",
                            backgroundColor: "#f9fafb",
                        }}
                    >
                        {[
                            ["🍱 전체 도시락", totalLunch],
                            ["🥣 전체 국", totalSoup],
                            ["🌱 전체 로하스밀", totalLohas],
                        ].map(([label, value]) => (
                            <div
                                key={label}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "8px",
                                    minWidth: 0,
                                }}
                            >
                                <span
                                    style={{
                                        minWidth: 0,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {label}
                                </span>
                                <span
                                    style={{
                                        flex: "0 0 auto",
                                        fontVariantNumeric: "tabular-nums",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {value}
                                </span>
                            </div>
                        ))}
                    </div>

                    {liveIssueList.length > 0 && (
                        <div
                            style={{
                                padding: "12px",
                                border: "1px solid #fecdd3",
                                borderRadius: "8px",
                                marginBottom: "14px",
                                backgroundColor: "#fff1f2",
                            }}
                        >
                            <div
                                style={{
                                    marginBottom: "8px",
                                    color: "#991b1b",
                                    fontWeight: "bold",
                                }}
                            >
                                문제 발생 호수
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "6px",
                                }}
                            >
                                {liveIssueList.map((room) => (
                                    <button
                                        key={`${room.buildingId}-${room.id}`}
                                        type="button"
                                        onClick={() => openBuilding(room.buildingId)}
                                        style={{
                                            minHeight: "32px",
                                            padding: "4px 8px",
                                            border: "1px solid #f43f5e",
                                            borderRadius: "6px",
                                            backgroundColor: "#ffffff",
                                            color: "#9f1239",
                                            fontWeight: "bold",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {room.buildingId}동 {room.room} 🚨
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div
                        style={{
                            display: "flex",
                            gap: "8px",
                            marginBottom: "14px",
                        }}
                    >
                        {[
                            ["expanded", "펼쳐보기"],
                            ["compact", "모아보기"],
                        ].map(([mode, label]) => {
                            const isActive = liveViewMode === mode;

                            return (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setLiveViewMode(mode)}
                                    style={{
                                        flex: "1 1 0",
                                        minHeight: "40px",
                                        border: isActive
                                            ? "2px solid #0f6b99"
                                            : "1px solid #d1d5db",
                                        borderRadius: "8px",
                                        backgroundColor: isActive
                                            ? "#e0f2fe"
                                            : "#ffffff",
                                        color: isActive
                                            ? "#075985"
                                            : "#374151",
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                    }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    {liveViewMode === "compact" ? (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                                gap: "10px",
                                marginBottom: "16px",
                            }}
                        >
                            {visibleDashboardBuildings.map((building) => {
                                const status =
                                    visibleBuildingStatus.find(
                                        (item) => item.id === building.id
                                    ) || {
                                        checked: 0,
                                        total: 0,
                                        issues: 0,
                                        hasDeliveryMemo: false,
                                    };
                                const rooms = [...(building.rooms || [])]
                                    .map(normalizeRoom)
                                    .filter((room) => !isRoomPaused(room))
                                    .sort(
                                        (a, b) =>
                                            parseInt(a.room) - parseInt(b.room)
                                    );

                                return (
                                    <div
                                        key={building.id}
                                        style={{
                                            minWidth: 0,
                                            border: status.issues > 0
                                                ? "2px solid #fecdd3"
                                                : "1px solid #d1d5db",
                                            borderRadius: "8px",
                                            padding: "8px",
                                            backgroundColor: "#ffffff",
                                            boxSizing: "border-box",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                gap: "6px",
                                                marginBottom: "8px",
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => openBuilding(building.id)}
                                                style={{
                                                    minWidth: 0,
                                                    padding: 0,
                                                    border: "none",
                                                    background: "transparent",
                                                    color: "#111827",
                                                    fontSize: "16px",
                                                    fontWeight: "bold",
                                                    cursor: "pointer",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {building.id}동
                                            </button>
                                            <span
                                                style={{
                                                    flex: "0 0 auto",
                                                    color: status.checked === status.total
                                                        ? "#15803d"
                                                        : "#4b5563",
                                                    fontSize: "12px",
                                                    fontWeight: "bold",
                                                    fontVariantNumeric: "tabular-nums",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {status.checked}/{status.total}
                                            </span>
                                        </div>

                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns:
                                                    "repeat(3, minmax(0, 1fr))",
                                                gap: "4px",
                                            }}
                                        >
                                            {rooms.map((room) => (
                                                <button
                                                    key={room.id}
                                                    type="button"
                                                    title={`${building.id}동 ${room.room}`}
                                                    onClick={() => openBuilding(building.id)}
                                                    style={{
                                                        minWidth: 0,
                                                        height: "28px",
                                                        padding: "0 4px",
                                                        border: room.checked
                                                            ? "1px solid #16a34a"
                                                            : "1px solid #d1d5db",
                                                        borderRadius: "4px",
                                                        backgroundColor: room.checked
                                                            ? "#ecfdf5"
                                                            : "#ffffff",
                                                        color: "#111827",
                                                        display: "grid",
                                                        gridTemplateColumns: "1fr 14px",
                                                        alignItems: "center",
                                                        gap: "2px",
                                                        cursor: "pointer",
                                                        fontSize: "12px",
                                                        fontWeight: "bold",
                                                        boxSizing: "border-box",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                            textAlign: "left",
                                                        }}
                                                    >
                                                        {room.room}
                                                    </span>
                                                    <span
                                                        aria-hidden="true"
                                                        style={{
                                                            color: "#15803d",
                                                            textAlign: "center",
                                                            lineHeight: 1,
                                                        }}
                                                    >
                                                        {room.checked ? "✓" : ""}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                                gap: "14px",
                                marginBottom: "16px",
                            }}
                        >
                        {visibleDashboardBuildings.map((building) => {
                            const status =
                                visibleBuildingStatus.find(
                                    (item) => item.id === building.id
                                ) || {
                                    checked: 0,
                                    total: 0,
                                    issues: 0,
                                    hasDeliveryMemo: false,
                                };
                            const rooms = [...(building.rooms || [])]
                                .map(normalizeRoom)
                                .sort(
                                    (a, b) =>
                                        parseInt(a.room) - parseInt(b.room)
                                );

                            return (
                                <div
                                    key={building.id}
                                    style={{
                                        border: status.issues > 0
                                            ? "2px solid #ef4444"
                                            : "1px solid #0f6b99",
                                        borderRadius: "8px",
                                        padding: "12px",
                                        backgroundColor: "#ffffff",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            gap: "10px",
                                            marginBottom: "10px",
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => openBuilding(building.id)}
                                            style={{
                                                padding: 0,
                                                border: "none",
                                                background: "transparent",
                                                color: "#111827",
                                                fontSize: "22px",
                                                fontWeight: "bold",
                                                cursor: "pointer",
                                            }}
                                        >
                                            {building.id}동
                                        </button>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                color: "#4b5563",
                                                fontSize: "14px",
                                                fontVariantNumeric: "tabular-nums",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {status.hasDeliveryMemo && (
                                                <span title="배달 특이사항 메모 있음">
                                                    📝
                                                </span>
                                            )}
                                            <span>
                                                ✓ {status.checked}/{status.total}
                                            </span>
                                            {status.issues > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setExpandedIssues(
                                                            expandedIssues === building.id
                                                                ? null
                                                                : building.id
                                                        )
                                                    }
                                                    style={{
                                                        border: "none",
                                                        background: "transparent",
                                                        color: "#dc2626",
                                                        fontWeight: "bold",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    🚨 {status.issues}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {expandedIssues === building.id && (
                                        <div
                                            style={{
                                                marginBottom: "10px",
                                                padding: "8px",
                                                borderRadius: "6px",
                                                backgroundColor: "#fff1f2",
                                                color: "#b91c1c",
                                                fontSize: "14px",
                                            }}
                                        >
                                            문제 호수:{" "}
                                            {issueRooms[building.id]
                                                ?.map((room) => room.room)
                                                .join(", ")}
                                        </div>
                                    )}

                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns:
                                                "repeat(4, minmax(0, 1fr))",
                                            gap: "8px",
                                        }}
                                    >
                                        {rooms.map((room) => {
                                            const paused = isRoomPaused(room);
                                            const borderColor = room.issue
                                                ? "#ef4444"
                                                : room.checked
                                                ? "#16a34a"
                                                : paused
                                                ? "#9ca3af"
                                                : "#d1d5db";
                                            const backgroundColor = room.issue
                                                ? "#fff1f2"
                                                : room.checked
                                                ? "#ecfdf5"
                                                : paused
                                                ? "#f3f4f6"
                                                : "#ffffff";
                                            const color = paused
                                                ? "#6b7280"
                                                : "#111827";

                                            return (
                                                <button
                                                    key={room.id}
                                                    type="button"
                                                    title={`${building.id}동 ${room.room}`}
                                                    onClick={() => openBuilding(building.id)}
                                                    style={{
                                                        minWidth: 0,
                                                        height: "36px",
                                                        padding: "0 6px",
                                                        border: `2px solid ${borderColor}`,
                                                        borderRadius: "4px",
                                                        backgroundColor,
                                                        color,
                                                        display: "grid",
                                                        gridTemplateColumns: "1fr 22px",
                                                        alignItems: "center",
                                                        gap: "2px",
                                                        cursor: "pointer",
                                                        fontSize: "14px",
                                                        fontWeight: "bold",
                                                        boxSizing: "border-box",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                            textAlign: "left",
                                                        }}
                                                    >
                                                        {room.room}
                                                    </span>
                                                    <span
                                                        aria-hidden="true"
                                                        style={{
                                                            textAlign: "center",
                                                            lineHeight: 1,
                                                        }}
                                                    >
                                                        {room.issue
                                                            ? "🚨"
                                                            : room.checked
                                                            ? "✓"
                                                            : paused
                                                            ? "Ⅱ"
                                                            : ""}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    )}



                </div>
            )}
            {tab === "dashboard" && (
                <div>
                    {renderDashboardSectionTitle("status", "전체 현황", 2)}

                    {dashboardSectionsOpen.status && (
                        <>
                        <div
                            style={{
                                padding: "10px",
                                border: "1px solid gray",
                                borderRadius: "10px",
                            }}
                        >
                        <div>🍱 전체 도시락 : {totalLunch}</div>
                        <div>🥣 전체 국 : {totalSoup}</div>
                        <div>🌱 전체 로하스밀 : {totalLohas}</div>
                        <div>
                            ☑ 전체 체크 :
                            {totalCheckedRooms}/{totalActiveRooms}

                        </div>
                        <hr
                            style={{
                                marginTop: "15px",
                                marginBottom: "15px",
                            }}
                        />
                        {buildingStatus
                            .filter(
                                (building) =>
                                    !hiddenBuildings.includes(
                                        building.id
                                    )
                            )
                            .map((building) => (
                                <div key={building.id}>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            marginBottom: "5px",
                                            padding: "4px",
                                            borderRadius: "5px",
                                        }}
                                    >
                                        <span
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "5px",
                                                cursor: "pointer",
                                                fontWeight: "bold",
                                            }}
                                            onClick={() => {
                                                if (
                                                    isDirty &&
                                                    building.id !== selectedBuilding &&
                                                    !window.confirm(
                                                        "저장하지 않은 변경사항이 있습니다.\n동을 변경할까요?"
                                                    )
                                                ) {
                                                    return;
                                                }

                                                window.history.pushState(
                                                    {
                                                        tab: "building",
                                                        building: building.id,
                                                    },
                                                    ""
                                                );

                                                if (building.id !== selectedBuilding) {
                                                    setIsDirty(false);
                                                    setEditData(null);
                                                    setBuildingData(null);
                                                    setBuildingNotice("");
                                                }

                                                setSelectedBuilding(building.id);

                                                setTab("building");
                                            }}
                                        >
                                            <span>{building.id}동</span>
                                            {building.hasDeliveryMemo && (
                                                <span
                                                    title="배달 특이사항 메모 있음"
                                                    aria-label="배달 특이사항 메모 있음"
                                                    style={{
                                                        fontSize: "16px",
                                                        lineHeight: 1,
                                                    }}
                                                >
                                                    📝
                                                </span>
                                            )}
                                        </span>

                                        <span
                                            style={{
                                                display: "flex",
                                                gap: "8px",
                                                alignItems: "center",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    width: "18px",
                                                    flex: "0 0 18px",
                                                }}
                                            >
                                                ☑
                                            </span>
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    width: "44px",
                                                    textAlign: "right",
                                                    fontVariantNumeric: "tabular-nums",
                                                }}
                                            >
                                                {building.checked}/{building.total}
                                            </span>

                                            {building.issues > 0 && (
                                                <span
                                                    style={{
                                                        cursor: "pointer",
                                                    }}
                                                    onClick={() =>
                                                        setExpandedIssues(
                                                            expandedIssues === building.id
                                                                ? null
                                                                : building.id
                                                        )
                                                    }
                                                >
                                                    🚨 {building.issues}
                                                </span>
                                            )}

                                        </span>


                                    </div>

                                    {expandedIssues === building.id && (
                                        <div
                                            style={{
                                                marginLeft: "20px",
                                                marginBottom: "10px",
                                                color: "red",
                                                fontSize: "14px",
                                            }}
                                        >
                                            <div>🚨 문제 호수</div>

                                            {issueRooms[building.id]?.map((room) => (
                                                <div key={room.id}>
                                                    - {room.room}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>



                            ))}

                        </div >

                        <button
                            onClick={resetAllDeliveryStatus}
                            style={{
                                width: "100%",
                                height: "40px",
                                marginTop: "10px",
                                marginBottom: "20px",
                                backgroundColor: "#aa3333",
                            }}
                        >
                            전체 배달 현황 초기화
                        </button>
                        </>
                    )}


                    {renderDashboardSectionTitle("notice", "전체 공지")}

                    {dashboardSectionsOpen.notice && (
                        <>
                        <textarea
                            value={notice}
                            onChange={(e) => setNotice(e.target.value)}
                            style={{
                                width: "100%",
                                height: "100px",
                            }}
                        />

                        <button
                            onClick={saveNotice}
                            style={{
                                marginTop: "10px",
                                marginBottom: "20px",
                            }}
                        >
                            공지 저장
                        </button>
                        </>
                    )}

                    {renderDashboardSectionTitle("guide", "사용 안내 수정")}

                    {dashboardSectionsOpen.guide && (
                        <>
                        <textarea
                            value={volunteerGuide}
                            onChange={(e) => setVolunteerGuide(e.target.value)}
                            style={{
                                width: "100%",
                                height: "220px",
                                boxSizing: "border-box",
                                lineHeight: 1.5,
                            }}
                        />

                        <button
                            onClick={saveVolunteerGuide}
                            style={{
                                marginTop: "10px",
                                marginBottom: "20px",
                            }}
                        >
                            사용 안내 저장
                        </button>
                        </>
                    )}

                    {renderDashboardSectionTitle("password", "비밀번호 변경")}

                    {dashboardSectionsOpen.password && (
                        <>
                        <input
                            type="password"
                            placeholder="현재 비밀번호"
                            value={currentPassword}
                            onChange={(e) =>
                                setCurrentPassword(e.target.value)
                            }
                            style={{
                                width: "100%",
                                height: "40px",
                                marginBottom: "10px",
                            }}
                        />

                        <input
                            type="password"
                            placeholder="새 비밀번호"
                            value={newPassword}
                            onChange={(e) =>
                                setNewPassword(e.target.value)
                            }
                            style={{
                                width: "100%",
                                height: "40px",
                                marginBottom: "10px",
                            }}
                        />

                        <button
                            onClick={async () => {
                                if (currentPassword !== adminPassword) {
                                    alert("현재 비밀번호가 틀렸습니다.");
                                    return;
                                }
                                if (!newPassword.trim()) {
                                    alert("비밀번호를 입력하세요.");
                                    return;
                                }

                                await setDoc(
                                    doc(db, "settings", "admin"),
                                    {
                                        password: newPassword,
                                    }
                                );

                                setAdminPassword(newPassword);
                                setNewPassword("");
                                setCurrentPassword("");

                                alert("비밀번호 변경 완료!");
                            }}
                            style={{
                                width: "100%",
                                height: "40px",
                            }}
                        >
                            비밀번호 변경
                        </button>
                        </>
                    )}

                </div>
            )}
            {tab === "building" && (
                <div>
                    <h2>동별 관리</h2>
                    <h2>동 선택</h2>

                    <select
                        value={selectedBuilding}
                        onChange={(e) => {

                            if (
                                isDirty &&
                                !window.confirm(
                                    "저장하지 않은 변경사항이 있습니다.\n동을 변경할까요?"
                                )
                            ) {
                                return;
                            }

                            setIsDirty(false);
                            setEditData(null);
                            setBuildingData(null);
                            setBuildingNotice("");
                            setSelectedBuilding(
                                e.target.value
                            );
                        }}
                        style={{
                            width: "100%",
                            height: "40px",
                            marginBottom: "20px",
                        }}
                    >
                        {buildings
                            .filter(
                                (building) =>
                                    !hiddenBuildings.includes(building)
                            )
                            .map((building) => (
                                <option
                                    key={building}
                                    value={building}
                                >
                                    {building}동
                                </option>
                            ))}
                    </select>

                    <div style={{ marginBottom: "20px" }}>

                        <input
                            type="text"
                            placeholder="예: 404-1"
                            value={newBuilding}
                            onChange={(e) =>
                                setNewBuilding(e.target.value)
                            }
                            style={{
                                width: "150px",
                            }}
                        />

                        <button
                            onClick={addBuilding}
                            style={{
                                marginLeft: "10px",
                            }}
                        >
                            동 추가
                        </button>

                    </div>

                    <h2>현재 선택 동</h2>
                    <button
                        onClick={hideBuilding}
                        style={{
                            width: "100%",
                            height: "40px",
                            marginBottom: "15px",
                            backgroundColor: "#aa3333",
                        }}
                    >
                        현재 동 숨기기
                    </button>

                    <div
                        style={{
                            padding: "10px",
                            border: "1px solid gray",
                            borderRadius: "10px",
                        }}
                    >
                        {selectedBuilding}동
                    </div>
                    {buildingData && (
                        <div
                            style={{
                                marginTop: "20px",
                                border: "1px solid gray",
                                borderRadius: "10px",
                                padding: "10px",
                            }}
                        >
                            <h3>동별 공지</h3>

                            {editData?.rooms?.some(room => room.issue) && (
                                <div
                                    style={{
                                        border: "2px solid red",
                                        borderRadius: "10px",
                                        padding: "10px",
                                        marginBottom: "15px",
                                        backgroundColor: "#fff0f0",
                                    }}
                                >
                                    <b>🚨 문제 발생 호수</b>

                                    {editData.rooms
                                        .filter(room => room.issue)
                                        .map(room => (
                                            <div key={room.id}>
                                                {room.room}
                                            </div>
                                        ))}
                                </div>
                            )}

                            <textarea
                                value={buildingNotice}
                                onChange={(e) => {
                                    setBuildingNotice(e.target.value);
                                    setIsDirty(true);
                                }}
                                style={{
                                    width: "100%",
                                    height: "80px",
                                    marginBottom: "10px",
                                }}
                            />

                            <div>
                                🍱 도시락 :
                                <input
                                    type="number"
                                    value={editData?.lunch || 0}
                                    onChange={(e) => {
                                        setEditData({
                                            ...editData,
                                            lunch: Math.max(
                                                Number(e.target.value),
                                                editData.rooms.length
                                            ),
                                        });
                                        setIsDirty(true);
                                    }}
                                    style={{ width: "80px", marginLeft: "10px" }}
                                />
                            </div>
                            <div>
                                🥣 국 :
                                <input
                                    type="number"
                                    value={editData?.soup || 0}
                                    onChange={(e) => {
                                        setEditData({
                                            ...editData,
                                            soup: Number(e.target.value),
                                        });
                                        setIsDirty(true);
                                    }}
                                    style={{ width: "80px", marginLeft: "10px" }}
                                />
                            </div>
                            <div>
                                🌱 로하스밀 :
                                <input
                                    type="number"
                                    value={editData?.lohas || 0}
                                    onChange={(e) => {
                                        setEditData({
                                            ...editData,
                                            lohas: Number(e.target.value),
                                        });
                                        setIsDirty(true);
                                    }}
                                    style={{ width: "80px", marginLeft: "10px" }}
                                />
                            </div>
                            <div>🏠 호수 수 : {editData?.rooms.length}</div>
                            <div
                                style={{
                                    marginTop: "15px",
                                    padding: "10px",
                                    border: "1px solid #7c8db5",
                                    borderRadius: "10px",
                                    backgroundColor: "#f7f9ff",
                                    whiteSpace: "pre-wrap",
                                }}
                            >
                                <b>배달 특이사항 메모</b>
                                <div
                                    style={{
                                        marginTop: "8px",
                                        minHeight: "44px",
                                        color: buildingData?.deliveryMemo
                                            ? "#222"
                                            : "#777",
                                    }}
                                >
                                    {buildingData?.deliveryMemo || "아직 입력된 메모가 없습니다."}
                                </div>
                            </div>
                            <div style={{ marginTop: "15px" }}>
                                {editData?.rooms.map((room) => (
                                    <div
                                        key={room.id}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            gap: "10px",
                                            marginBottom: "12px",
                                            paddingBottom: "12px",
                                            borderBottom: "1px solid #444",
                                            opacity:
                                                room.paused
                                                    ? 0.55
                                                    : 1,
                                        }}
                                    >
                                        <div
                                            style={{
                                                flex: 1,
                                                minWidth: 0,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    marginBottom: "6px",
                                                    fontSize: "18px",
                                                    fontWeight: "bold",
                                                    textDecoration:
                                                        room.paused
                                                            ? "line-through"
                                                            : "none",
                                                }}
                                            >
                                                🏠 {room.room}
                                            </div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    gap: "5px",
                                                    alignItems: "center",
                                                    marginBottom: "6px",
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => {

                                                        setEditData({
                                                            ...editData,
                                                            rooms: editData.rooms.map((r) =>
                                                                r.id === room.id
                                                                    ? {
                                                                        ...r,
                                                                        soupExcluded:
                                                                            !r.soupExcluded,
                                                                    }
                                                                    : r
                                                            ),
                                                        });

                                                        setIsDirty(true);
                                                    }}
                                                >
                                                    {room.soupExcluded
                                                        ? "🥣 국X ✓"
                                                        : "🥣 국X"}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {

                                                        setEditData({
                                                            ...editData,
                                                            rooms: editData.rooms.map((r) =>
                                                                r.id === room.id
                                                                    ? {
                                                                        ...r,
                                                                        lohasExcluded:
                                                                            !r.lohasExcluded,
                                                                    }
                                                                    : r
                                                            ),
                                                        });

                                                        setIsDirty(true);
                                                    }}
                                                >
                                                    {room.lohasExcluded
                                                        ? "🌱 로하스밀X ✓"
                                                        : "🌱 로하스밀X"}
                                                </button>

                                                <select
                                                    value={room.specialRequest || ""}
                                                    onChange={(e) => {

                                                        setEditData({
                                                            ...editData,
                                                            rooms: editData.rooms.map((r) =>
                                                                r.id === room.id
                                                                    ? {
                                                                        ...r,
                                                                        specialRequest:
                                                                            e.target.value,
                                                                    }
                                                                    : r
                                                            ),
                                                        });

                                                        setIsDirty(true);
                                                    }}
                                                    style={{
                                                        flex: "1 1 130px",
                                                        minWidth: "120px",
                                                        height: "30px",
                                                    }}
                                                >
                                                    <option value="">
                                                        없음
                                                    </option>

                                                    <option value="반찬만">
                                                        반찬만
                                                    </option>

                                                    <option value="밥 많이">
                                                        밥 많이
                                                    </option>

                                                    <option value="밥 더 많이">
                                                        밥 더 많이
                                                    </option>

                                                    <option value="반찬 많이">
                                                        반찬 많이
                                                    </option>

                                                    <option value="선물 배달">
                                                        선물 배달
                                                    </option>
                                                </select>
                                            </div>

                                            <textarea
                                                value={room.memo}
                                                placeholder="메모 입력"
                                                onChange={(e) => {
                                                    setEditData({
                                                        ...editData,
                                                        rooms: editData.rooms.map((r) =>
                                                            r.id === room.id
                                                                ? {
                                                                    ...r,
                                                                    memo: e.target.value,
                                                                }
                                                                : r
                                                        ),
                                                    });

                                                    setIsDirty(true);
                                                }}
                                                style={{
                                                    boxSizing: "border-box",
                                                    width: "100%",
                                                    minHeight: "54px",
                                                    resize: "vertical",
                                                }}
                                            />
                                        </div>

                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "6px",
                                                alignSelf: "flex-start",
                                            }}
                                        >
                                        <button
                                            onClick={() => deleteRoom(room.id)}
                                            style={{
                                                alignSelf: "flex-start",
                                                minWidth: "48px",
                                                height: "34px",
                                                border: "none",
                                                borderRadius: "5px",
                                                backgroundColor: "#c62828",
                                                color: "white",
                                                fontWeight: "bold",
                                                cursor: "pointer",
                                            }}
                                        >
                                            삭제
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditData({
                                                    ...editData,
                                                    rooms: editData.rooms.map((r) =>
                                                        r.id === room.id
                                                            ? {
                                                                ...r,
                                                                paused: !r.paused,
                                                                checked:
                                                                    !r.paused
                                                                        ? false
                                                                        : r.checked,
                                                            }
                                                            : r
                                                    ),
                                                });

                                                setIsDirty(true);
                                            }}
                                            style={{
                                                minWidth: "64px",
                                                minHeight: "34px",
                                                border: "1px solid #777",
                                                borderRadius: "5px",
                                                backgroundColor:
                                                    room.paused
                                                        ? "#f59e0b"
                                                        : "#f3f4f6",
                                                color:
                                                    room.paused
                                                        ? "#111827"
                                                        : "#333",
                                                fontWeight: "bold",
                                                cursor: "pointer",
                                            }}
                                        >
                                            {room.paused
                                                ? "재개"
                                                : "일시 중지"}
                                        </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: "15px" }}>
                                <input
                                    type="text"
                                    value={newRoom}
                                    placeholder="예: 1501호"
                                    onChange={(e) =>
                                        setNewRoom(
                                            e.target.value.replace(/[^0-9]/g, "")
                                        )
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            addRoom();
                                        }
                                    }}
                                    style={{
                                        width: "150px",
                                    }}
                                />

                                <button
                                    onClick={addRoom}
                                    style={{
                                        marginLeft: "10px",
                                    }}
                                >
                                    호수 추가
                                </button>
                            </div>
                            <button
                                onClick={saveBuilding}
                                style={{
                                    marginTop: "15px",
                                    width: "100%",
                                    height: "55px",
                                    backgroundColor:
                                        isDirty
                                            ? "#ff8800"
                                            : "#2d8cff",
                                    color: "white",
                                    fontWeight: "bold",
                                    fontSize: "18px",
                                }}
                            >
                                {isDirty
                                    ? "⚠ 저장 필요"
                                    : "동 정보 저장"}
                            </button>

                            <button
                                onClick={resetChecks}
                                style={{
                                    marginTop: "10px",
                                    width: "100%",
                                    height: "40px",
                                    backgroundColor: "#aa3333",
                                }}
                            >
                                체크 초기화
                            </button>
                        </div>
                    )}
                </div>

            )}
            {tab === "hidden" && (
                <div>

                    <h2>숨김 관리</h2>

                    {hiddenBuildings.length === 0 && (
                        <p>숨겨진 동이 없습니다.</p>
                    )}

                    {hiddenBuildings.map((building) => (

                        <div
                            key={building}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "10px",
                                padding: "10px",
                                border: "1px solid gray",
                                borderRadius: "5px",
                            }}
                        >
                            <span>{building}동</span>

                            <div
                                style={{
                                    display: "flex",
                                    gap: "5px",
                                }}
                            >
                                <button
                                    onClick={() =>
                                        restoreBuilding(building)
                                    }
                                >
                                    복구
                                </button>

                                <button
                                    onClick={() =>
                                        deleteBuilding(building)
                                    }
                                    style={{
                                        backgroundColor: "#aa3333",
                                    }}
                                >
                                    삭제
                                </button>
                            </div>

                        </div>

                    ))}

                </div>
            )}
        </div>
    );
}

export default Admin;
