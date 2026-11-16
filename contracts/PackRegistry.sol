// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title PackRegistry — Remixly content packs on BOT Chain
/// @notice Records a published content pack (title, hashes, IPFS cid, format count) and which formats went live.
///         No tokens, no payments, no owner. Only hashes, a short title, a cid and the live post URLs go on-chain.
contract PackRegistry {
    struct Pack {
        address owner;
        string title;
        bytes32 sourceHash; // keccak256 of the source text (the text itself never leaves the browser)
        bytes32 packHash;   // keccak256 of the exact pack JSON pinned to IPFS
        string cid;         // IPFS cid of the pack JSON
        uint8 formats;      // number of formats in the pack
        uint8 posted;       // formats marked live (each counted once)
        uint64 at;          // publish time
    }

    uint256 public constant MAX_TITLE = 60;
    uint256 public constant MAX_FORMATS = 10;
    uint256 public constant MAX_URL = 200;
    uint256 public constant MAX_CID = 100;

    Pack[] public packs;
    mapping(address => uint256[]) private packsOf;
    mapping(uint256 => mapping(uint8 => bool)) public isPosted;
    /// @notice keccak256 of the latest live URL recorded for a format (the URL itself is in the Posted event).
    mapping(uint256 => mapping(uint8 => bytes32)) public postedUrlHash;
    /// @notice Total formats marked live across all packs (each pack/format counted once).
    uint256 public postsLive;

    event Published(uint256 indexed id, address indexed owner);
    event Posted(uint256 indexed id, uint8 formatIndex, string url);

    error EmptyTitle();
    error TitleTooLong();
    error BadFormats();
    error CidTooLong();
    error NoSuchPack();
    error NotOwner();
    error BadFormatIndex();
    error BadUrl();

    function publish(string calldata title, bytes32 sourceHash, bytes32 packHash, string calldata cid, uint8 formats)
        external
        returns (uint256 id)
    {
        uint256 t = bytes(title).length;
        if (t == 0) revert EmptyTitle();
        if (t > MAX_TITLE) revert TitleTooLong();
        if (formats == 0 || formats > MAX_FORMATS) revert BadFormats();
        if (bytes(cid).length > MAX_CID) revert CidTooLong();

        id = packs.length;
        packs.push(Pack(msg.sender, title, sourceHash, packHash, cid, formats, 0, uint64(block.timestamp)));
        packsOf[msg.sender].push(id);
        emit Published(id, msg.sender);
    }

    /// @notice Mark one format of your pack as posted, with its live link. Calling again replaces the link
    ///         (a new event is emitted) but the format is only counted once.
    function markPosted(uint256 id, uint8 formatIndex, string calldata url) external {
        if (id >= packs.length) revert NoSuchPack();
        Pack storage p = packs[id];
        if (p.owner != msg.sender) revert NotOwner();
        if (formatIndex >= p.formats) revert BadFormatIndex();
        uint256 u = bytes(url).length;
        if (u == 0 || u > MAX_URL) revert BadUrl();

        if (!isPosted[id][formatIndex]) {
            isPosted[id][formatIndex] = true;
            p.posted += 1;
            postsLive += 1;
        }
        postedUrlHash[id][formatIndex] = keccak256(bytes(url));
        emit Posted(id, formatIndex, url);
    }

    // ---------- views ----------
    function getPack(uint256 id) external view returns (Pack memory) {
        if (id >= packs.length) revert NoSuchPack();
        return packs[id];
    }

    /// @notice Packs [from, from + count), clipped to the end of the list.
    function getPacks(uint256 from, uint256 count) external view returns (Pack[] memory out) {
        uint256 n = packs.length;
        if (from >= n) return new Pack[](0);
        uint256 end = from + count > n ? n : from + count;
        out = new Pack[](end - from);
        for (uint256 i = from; i < end; i++) out[i - from] = packs[i];
    }

    function packsBy(address owner) external view returns (uint256[] memory) {
        return packsOf[owner];
    }

    function total() external view returns (uint256) {
        return packs.length;
    }
}
