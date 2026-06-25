import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    getDocs,
    deleteDoc,
    onSnapshot,
} from "firebase/firestore";

function Admin() {

    const [notice, setNotice] = useState("");
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
    const issueRooms = dashboardData.reduce(
        (acc, building) => {
            acc[building.id] =
                (building.rooms || [])
                    .filter(room => room.issue);

            return acc;
        },
        {}
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

    const totalLunch = dashboardData.reduce(
        (sum, building) =>
            sum + (building.lunch || 0),
        0
    );

    const totalSoup = dashboardData.reduce(
        (sum, building) =>
            sum + (building.soup || 0),
        0
    );

    const totalLohas = dashboardData.reduce(
        (sum, building) =>
            sum + (building.lohas || 0),
        0
    );

    const buildingStatus = dashboardData.map(
        (building) => ({
            id: building.id,
            checked:
                (building.rooms || []).filter(
                    (room) => room.checked
                ).length,
            total:
                (building.rooms || []).length,

            issues:
                (building.rooms || []).filter(
                    (room) => room.issue
                ).length,
            hasDeliveryMemo:
                Boolean((building.deliveryMemo || "").trim()),
        })
    );

    async function saveBuilding() {

        const sortedRooms = [...editData.rooms].sort(
            (a, b) =>
                parseInt(a.room) - parseInt(b.room)
        );

        await setDoc(
            doc(db, "buildings", selectedBuilding),
            {
                ...editData,
                rooms: sortedRooms,
                notice: buildingNotice,
                deliveryMemo: buildingData?.deliveryMemo || "",
            }
        );

        setEditData({
            ...editData,
            rooms: sortedRooms,
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
        window.location.reload();
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
        };


        setEditData({
            ...editData,
            rooms: [...editData.rooms, newItem],
        });
        setIsDirty(true);

        setNewRoom("");
    }
    function deleteRoom(roomId) {
        setEditData({
            ...editData,
            rooms: editData.rooms.filter(
                (room) => room.id !== roomId
            ),
        });
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

                data.rooms = (data.rooms || []).map((room) => ({
                    checked: false,
                    ...room,
                }));

                setBuildingData(data);

                if (!isDirty) {
                    setBuildingNotice(data.notice || "");
                    setEditData(data);
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
                    style={{
                        width: "100%",
                        height: "40px",
                        marginBottom: "10px",
                    }}
                />

                <button
                    onClick={() => {
                        if (password === adminPassword) {

                            window.history.replaceState(
                                { tab: "dashboard" },
                                ""
                            );

                            setIsLoggedIn(true);
                        } else {
                            alert("비밀번호가 틀렸습니다.");
                        }
                    }}
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
                maxWidth: "500px",
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
            {tab === "dashboard" && (
                <div>
                    <h2>전체 현황</h2>



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
                            {
                                dashboardData.reduce(
                                    (sum, building) =>
                                        sum +
                                        (building.rooms || []).filter(
                                            (room) => room.checked
                                        ).length,
                                    0
                                )
                            }

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
                                <>
                                    <div
                                        key={building.id}
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

                                                window.history.pushState(
                                                    {
                                                        tab: "building",
                                                        building: building.id,
                                                    },
                                                    ""
                                                );

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
                                                gap: "10px",
                                                alignItems: "center",
                                            }}
                                        >
                                            <span>
                                                ☑ {building.checked}/{building.total}
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
                                </>



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


                    <h3>전체 공지</h3>

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

                    <hr style={{ marginTop: "20px" }} />

                    <h3>비밀번호 변경</h3>
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
                                            lunch: Number(e.target.value),
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
                                            marginBottom: "5px",
                                        }}
                                    >
                                        <div>
                                            <div>🏠 {room.room}</div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: "5px",
                                                    marginTop: "3px",
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
                                            </div>

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
                                                    width: "150px",
                                                    marginTop: "3px",
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
                                            </select>

                                            <input
                                                type="text"
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
                                                    width: "150px",
                                                    marginTop: "3px",
                                                }}
                                            />
                                        </div>

                                        <button
                                            onClick={() => deleteRoom(room.id)}
                                        >
                                            삭제
                                        </button>
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
